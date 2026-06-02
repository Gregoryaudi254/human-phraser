from __future__ import annotations

import asyncio
import logging
import math
from dataclasses import dataclass
from functools import lru_cache
from collections.abc import Callable
from typing import Literal

from anthropic import Anthropic, AnthropicError
from fastapi import HTTPException, status
import httpx

from app.config import settings
from app.scoring import aggregate_naturalness

RewriteMode = Literal["light", "standard", "deep"]
logger = logging.getLogger(__name__)

BASE_SYSTEM_PROMPT = """You are a skilled editor and human writer. Rewrite the following draft text so it reads clearly, naturally, and with an authentic human voice.

Rules:
- Use contractions naturally (don't, it's, you'll, we're).
- Vary sentence length deliberately: mix short punchy sentences with longer ones.
- Include natural hedges where appropriate: "generally", "in most cases", "it seems like", "arguably".
- Use informal connectives: "but", "so", "though", "still", "either way".
- Avoid rigidly parallel list structures. Let the writing breathe naturally.
- Do not add new information or change the meaning.
- Do not use em dashes excessively.
- Output only the rewritten text. No preamble."""

LIGHT_SYSTEM_PROMPT = f"""{BASE_SYSTEM_PROMPT}

Mode guidance:
- Make light improvements only.
- Preserve the original structure, paragraph order, and emphasis closely.
- Smooth stiff phrasing without making the piece feel rewritten from scratch."""

STANDARD_SYSTEM_PROMPT = f"""{BASE_SYSTEM_PROMPT}

Mode guidance:
- Make a deeper editorial pass.
- Improve burstiness, sentence rhythm, and vocabulary naturalness.
- Replace mechanical transitions with natural connective tissue.
- Keep the user's meaning intact, but let the prose feel less uniform."""

DEEP_SYSTEM_PROMPT = f"""{BASE_SYSTEM_PROMPT}
- Let occasional mild informality come through naturally (as good writers do).
- Use sentence fragments or trailing prepositions where they improve flow.
- Add one brief personal-voice aside if the content allows.

Mode guidance:
- Push harder on voice, rhythm, authenticity, and flow.
- Rework awkward sentence shapes instead of only swapping words.
- Preserve facts, claims, and intent exactly."""


@dataclass(frozen=True)
class RewriteResult:
    text: str
    score: float | None
    attempts: int
    perplexity: float | None = None
    score_breakdown: dict[str, float] | None = None


def count_words(text: str) -> int:
    return len([word for word in text.strip().split() if word])


def _anthropic_client() -> Anthropic:
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY is not configured.",
        )
    return Anthropic(api_key=settings.anthropic_api_key)


def _call_llm(text: str, system_prompt: str) -> str:
    provider = settings.llm_provider.lower().strip()
    if provider == "gemini":
        return _call_gemini(text, system_prompt)
    if provider == "anthropic":
        return _call_anthropic(text, system_prompt)
    if provider in {"grok", "xai"}:
        return _call_xai(text, system_prompt)
    if provider == "groq":
        return _call_groq(text, system_prompt)

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            f"Unsupported LLM_PROVIDER '{settings.llm_provider}'. "
            "Use 'gemini', 'grok', 'anthropic', or 'groq'."
        ),
    )


def _call_anthropic(text: str, system_prompt: str) -> str:
    try:
        message = _anthropic_client().messages.create(
            model=settings.anthropic_model,
            max_tokens=4096,
            temperature=0.78,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Draft text:\n\n{text}",
                }
            ],
        )
    except AnthropicError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The rewriting service is temporarily unavailable.",
        ) from exc

    chunks: list[str] = []
    for block in message.content:
        if block.type == "text":
            chunks.append(block.text)

    rewritten = "".join(chunks).strip()
    if not rewritten:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The rewriting service returned an empty response.",
        )

    return rewritten


def _call_xai(text: str, system_prompt: str) -> str:
    if not settings.xai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="XAI_API_KEY is not configured.",
        )

    try:
        response = httpx.post(
            f"{settings.xai_base_url.rstrip('/')}/responses",
            headers={
                "Authorization": f"Bearer {settings.xai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.xai_model,
                "input": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Draft text:\n\n{text}"},
                ],
                "temperature": 0.78,
                "max_output_tokens": 4096,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as exc:
        logger.exception("xAI rewrite request failed with HTTP status")
        detail = _provider_error_message(exc.response, "xAI")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except httpx.HTTPError as exc:
        logger.exception("xAI rewrite request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The xAI rewriting service is temporarily unavailable.",
        ) from exc

    rewritten = _extract_xai_output_text(payload).strip()
    if not rewritten:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The xAI rewriting service returned an empty response.",
        )

    return rewritten


def _call_groq(text: str, system_prompt: str) -> str:
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY is not configured.",
        )

    try:
        response = httpx.post(
            f"{settings.groq_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Draft text:\n\n{text}"},
                ],
                "temperature": 0.78,
                "max_tokens": 4096,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as exc:
        logger.exception("Groq rewrite request failed with HTTP status")
        detail = _provider_error_message(exc.response, "Groq")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except httpx.HTTPError as exc:
        logger.exception("Groq rewrite request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The Groq rewriting service is temporarily unavailable.",
        ) from exc

    rewritten = _extract_openai_chat_content(payload).strip()
    if not rewritten:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The Groq rewriting service returned an empty response.",
        )

    return rewritten


def _extract_openai_chat_content(payload: dict[str, object]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    first = choices[0]
    if not isinstance(first, dict):
        return ""

    message = first.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        return message["content"]

    return ""


def _extract_xai_output_text(payload: dict[str, object]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str):
        return output_text

    chunks: list[str] = []
    output = payload.get("output")
    if isinstance(output, list):
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if not isinstance(content, list):
                continue
            for content_item in content:
                if isinstance(content_item, dict) and isinstance(content_item.get("text"), str):
                    chunks.append(content_item["text"])

    return "".join(chunks)


def _provider_error_message(response: httpx.Response, provider_name: str) -> str:
    try:
        payload = response.json()
    except ValueError:
        return f"The {provider_name} rewriting service returned HTTP {response.status_code}."

    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict) and isinstance(error.get("message"), str):
        return error["message"]

    return f"The {provider_name} rewriting service returned HTTP {response.status_code}."


def _call_gemini(text: str, system_prompt: str) -> str:
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured.",
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini SDK is not installed.",
        ) from exc

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=f"Draft text:\n\n{text}",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=4096,
                temperature=0.78,
            ),
        )
    except Exception as exc:
        logger.exception("Gemini rewrite request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The Gemini rewriting service is temporarily unavailable.",
        ) from exc

    rewritten = (response.text or "").strip()
    if not rewritten:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The Gemini rewriting service returned an empty response.",
        )

    return rewritten


async def rewrite_light(text: str) -> str:
    return await asyncio.to_thread(_call_llm, text, LIGHT_SYSTEM_PROMPT)


async def rewrite_standard(text: str) -> RewriteResult:
    rewritten = await asyncio.to_thread(_call_llm, text, STANDARD_SYSTEM_PROMPT)
    perplexity = await asyncio.to_thread(score_perplexity, rewritten)
    naturalness = await _score_naturalness_with_fallback(rewritten, perplexity)
    return RewriteResult(
        text=rewritten,
        score=naturalness.score,
        attempts=1,
        perplexity=perplexity,
        score_breakdown=naturalness.breakdown,
    )


async def rewrite_deep(
    text: str,
    max_attempts: int = 4,
    progress_callback: Callable[[int, int], None] | None = None,
) -> RewriteResult:
    current_text = text
    best_text = text
    best_score = 0.0
    best_perplexity: float | None = None
    best_breakdown: dict[str, float] | None = None

    for attempt in range(1, max_attempts + 1):
        if progress_callback:
            progress_callback(attempt, max_attempts)
        prompt = _build_deep_attempt_prompt(attempt)
        rewritten = await asyncio.to_thread(_call_llm, current_text, prompt)
        perplexity = await asyncio.to_thread(score_perplexity, rewritten)
        naturalness = await _score_naturalness_with_fallback(rewritten, perplexity)
        score = naturalness.score

        if score >= best_score:
            best_text = rewritten
            best_score = score
            best_perplexity = perplexity
            best_breakdown = naturalness.breakdown

        if score >= 0.8:
            return RewriteResult(
                text=rewritten,
                score=score,
                attempts=attempt,
                perplexity=perplexity,
                score_breakdown=naturalness.breakdown,
            )

        current_text = rewritten

    return RewriteResult(
        text=best_text,
        score=best_score,
        attempts=max_attempts,
        perplexity=best_perplexity,
        score_breakdown=best_breakdown,
    )


async def _score_naturalness_with_fallback(text: str, perplexity: float) -> "NaturalnessScoreLike":
    try:
        return await aggregate_naturalness(text)
    except (HTTPException, RuntimeError) as exc:
        logger.info("Using local naturalness fallback: %s", exc)
        return NaturalnessScoreLike(
            score=_naturalness_from_perplexity(perplexity),
            breakdown={"local_perplexity": round(perplexity, 2)},
        )


@dataclass(frozen=True)
class NaturalnessScoreLike:
    score: float
    breakdown: dict[str, float]


def _naturalness_from_perplexity(perplexity: float) -> float:
    if perplexity <= 0:
        return 0.5
    if perplexity < 50:
        return round(0.45 + min(perplexity / 50, 1) * 0.3, 2)
    if perplexity <= 200:
        return round(0.75 + ((perplexity - 50) / 150) * 0.15, 2)
    return round(max(0.65, 0.9 - min((perplexity - 200) / 400, 0.25)), 2)


def _build_deep_attempt_prompt(attempt: int) -> str:
    pressure = [
        "Keep the rewrite natural and polished.",
        "The previous style may still be too uniform. Add more sentence rhythm variation and ease.",
        "Push harder on authentic voice while preserving meaning exactly.",
        "Make the result feel publication-ready, human, and unforced.",
    ][min(attempt - 1, 3)]
    return f"{DEEP_SYSTEM_PROMPT}\n\nQuality loop instruction:\n- {pressure}"


@lru_cache(maxsize=1)
def _load_gpt2() -> tuple[object, object]:
    try:
        import torch
        from transformers import GPT2LMHeadModel, GPT2TokenizerFast
    except ImportError as exc:
        raise RuntimeError("GPT-2 scoring dependencies are not installed.") from exc

    tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
    model = GPT2LMHeadModel.from_pretrained("gpt2")
    model.eval()
    return tokenizer, model


def score_perplexity(text: str) -> float:
    if not text.strip():
        return 0.0

    try:
        import torch
    except ImportError as exc:
        raise RuntimeError("PyTorch is required for GPT-2 perplexity scoring.") from exc

    tokenizer, model = _load_gpt2()
    encodings = tokenizer(text, return_tensors="pt", truncation=True, max_length=1024)

    with torch.no_grad():
        outputs = model(**encodings, labels=encodings["input_ids"])
        loss = outputs.loss

    return float(math.exp(loss.item()))


def perplexity_to_naturalness(perplexity: float) -> float:
    if perplexity <= 0:
        return 0.0

    # The product target treats 50-200 as the normal human range. This maps
    # that band to a high but not automatic score, with graceful falloff outside it.
    if 50 <= perplexity <= 200:
        distance_from_center = abs(perplexity - 125) / 75
        return round(max(0.8, 0.96 - (distance_from_center * 0.12)), 2)

    if perplexity < 50:
        return round(max(0.15, perplexity / 62.5), 2)

    return round(max(0.35, 1 - ((perplexity - 200) / 600)), 2)
