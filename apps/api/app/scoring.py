from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import settings


@dataclass(frozen=True)
class NaturalnessScore:
    score: float
    breakdown: dict[str, float]


class ScoringError(RuntimeError):
    pass


async def score_gptzero(text: str) -> float:
    if not settings.gptzero_api_key:
        raise ScoringError("GPTZERO_API_KEY is not configured.")

    async with httpx.AsyncClient(timeout=3) as client:
        response = await client.post(
            "https://api.gptzero.me/v2/predict/text",
            headers={
                "x-api-key": settings.gptzero_api_key,
                "Content-Type": "application/json",
            },
            json={"document": text},
        )
        response.raise_for_status()

    return _naturalness_from_payload(response.json(), provider="gptzero")


async def score_originality(text: str) -> float:
    if not settings.originality_api_key:
        raise ScoringError("ORIGINALITY_API_KEY is not configured.")

    async with httpx.AsyncClient(timeout=3) as client:
        response = await client.post(
            "https://api.originality.ai/api/v1/scan/ai",
            headers={
                "X-OAI-API-KEY": settings.originality_api_key,
                "Content-Type": "application/json",
            },
            json={"content": text},
        )
        response.raise_for_status()

    return _naturalness_from_payload(response.json(), provider="originality")


async def aggregate_naturalness(text: str) -> NaturalnessScore:
    scorers = []
    if settings.gptzero_api_key:
        scorers.append(("gptzero", score_gptzero(text)))
    if settings.originality_api_key:
        scorers.append(("originality", score_originality(text)))

    if not scorers:
        raise ScoringError("No external naturalness scoring APIs are configured.")

    try:
        scores = await asyncio.gather(*(scorer for _, scorer in scorers))
    except (ScoringError, httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Naturalness scoring failed: {exc}",
        ) from exc

    breakdown = {name: score for (name, _), score in zip(scorers, scores, strict=True)}
    score = round(sum(scores) / len(scores), 2)
    return NaturalnessScore(
        score=score,
        breakdown=breakdown,
    )


async def aggregate_naturalness_score(text: str) -> float:
    result = await aggregate_naturalness(text)
    return result.score


def _naturalness_from_payload(payload: Any, provider: str) -> float:
    if provider == "gptzero":
        direct = _first_number_by_keys(
            payload,
            [
                "human_probability",
                "human_prob",
                "human_score",
                "prob_human",
                "completely_human_prob",
            ],
        )
        if direct is not None:
            return _normalize_probability(direct)

        ai_score = _first_number_by_keys(
            payload,
            [
                "completely_generated_prob",
                "average_generated_prob",
                "ai_probability",
                "ai_prob",
                "generated_prob",
            ],
        )
        if ai_score is not None:
            return round(1 - _normalize_probability(ai_score), 2)

    if provider == "originality":
        direct = _first_number_by_keys(
            payload,
            [
                "human",
                "original",
                "original_score",
                "human_score",
                "probability_human",
            ],
        )
        if direct is not None:
            return _normalize_probability(direct)

        ai_score = _first_number_by_keys(
            payload,
            [
                "ai",
                "ai_score",
                "probability_ai",
                "generated",
            ],
        )
        if ai_score is not None:
            return round(1 - _normalize_probability(ai_score), 2)

    raise ValueError(f"Could not extract {provider} naturalness score from API response.")


def _first_number_by_keys(payload: Any, keys: list[str]) -> float | None:
    if isinstance(payload, dict):
        for key in keys:
            value = payload.get(key)
            if isinstance(value, int | float):
                return float(value)
            if isinstance(value, str):
                try:
                    return float(value)
                except ValueError:
                    pass

        for value in payload.values():
            nested = _first_number_by_keys(value, keys)
            if nested is not None:
                return nested

    if isinstance(payload, list):
        for item in payload:
            nested = _first_number_by_keys(item, keys)
            if nested is not None:
                return nested

    return None


def _normalize_probability(value: float) -> float:
    if value > 1:
        value = value / 100
    return round(max(0.0, min(1.0, value)), 2)
