"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";
import { DiffView } from "@/components/diff-view";
import { NaturalnessScoreBadge } from "@/components/naturalness-score-badge";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";

type RewriteMode = "light" | "standard" | "deep";

type ScoreBreakdown = {
  gptzero?: number;
  originality?: number;
};

type RewriteDonePayload = {
  rewritten_text: string;
  naturalness_score: number | null;
  attempts: number;
  words_used: number;
  perplexity: number | null;
  score_breakdown: ScoreBreakdown | null;
};

type RewriteJobResponse =
  | {
      cached: true;
      result: RewriteDonePayload;
    }
  | {
      cached: false;
      job_id: string;
    };

type JobStatusResponse = {
  job_id: string;
  status: "pending" | "processing" | "complete" | "failed";
  progress: { message?: string; current?: number; total?: number } | null;
  result: RewriteDonePayload | null;
  error?: string;
};

type ApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
};

const modes: Array<{ value: RewriteMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep" }
];

const apiUrl = getApiUrl();

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function EditorShell() {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<RewriteMode>("light");
  const [draft, setDraft] = useState("");
  const [output, setOutput] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number | null>(null);
  const [perplexity, setPerplexity] = useState<number | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const wordCount = useMemo(() => getWordCount(draft), [draft]);

  useEffect(() => {
    const reImproveText = window.localStorage.getItem("humaniser:re-improve-text");
    if (reImproveText) {
      setDraft(reImproveText);
      window.localStorage.removeItem("humaniser:re-improve-text");
    }
  }, []);

  async function handleImprove() {
    setIsProcessing(true);
    setOutput("");
    setScore(null);
    setAttempts(null);
    setPerplexity(null);
    setScoreBreakdown(null);
    setProgressMessage(null);
    setError(null);

    try {
      posthog.capture("rewrite_started", { mode, words_used: wordCount });
      const token = await getToken();
      if (!token) {
        throw new Error("Your session is not ready. Please sign in again.");
      }

      let activeToken = token;
      let response = await postRewrite(activeToken, draft, mode);
      if (response.status === 401) {
        const message = await readErrorMessage(response);
        if (message === "Invalid token") {
          const freshToken = await getToken({ skipCache: true });
          if (freshToken) {
            activeToken = freshToken;
            response = await postRewrite(activeToken, draft, mode);
          } else {
            throw new Error(message);
          }
        } else {
          throw new Error(message);
        }
      }

      if (!response.ok || !response.body) {
        const message = await readErrorMessage(response);
        throw new Error(message);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as RewriteJobResponse;
        if (payload.cached) {
          applyRewriteResult(payload.result);
        } else {
          setProgressMessage("Queued for processing...");
          await pollRewriteJob(payload.job_id, activeToken, setProgressMessage, applyRewriteResult);
        }
      } else {
        await readRewriteStream(response.body, {
          onToken: (tokenText) => setOutput((current) => `${current}${tokenText}`),
          onDone: applyRewriteResult
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to improve this draft.");
    } finally {
      setIsProcessing(false);
    }
  }

  function applyRewriteResult(payload: RewriteDonePayload) {
    setOutput(payload.rewritten_text);
    setScore(payload.naturalness_score);
    setAttempts(payload.attempts);
    setPerplexity(payload.perplexity);
    setScoreBreakdown(payload.score_breakdown);
    posthog.capture("rewrite_completed", {
      mode,
      words_used: payload.words_used,
      naturalness_score: payload.naturalness_score
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-73px)] grid-rows-[auto_1fr]">
      <section className="flex flex-col gap-4 border-b bg-card/60 px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Writing editor</h2>
          <p className="text-sm text-muted-foreground">Paste a draft, choose a rewrite depth, and compare the result.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 rounded-lg border bg-background p-1 shadow-sm">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value);
                  posthog.capture("mode_selected", { mode: item.value });
                }}
                className={cn(
                  "h-9 cursor-pointer rounded-md px-4 text-sm font-medium transition-colors",
                  mode === item.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button className="gap-2" disabled={wordCount === 0 || isProcessing} onClick={handleImprove}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Improve Writing
          </Button>
        </div>
      </section>

      <section className="grid gap-5 p-4 lg:grid-cols-2 lg:p-6">
        <div className="flex min-h-[34rem] flex-col rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-medium">Draft</h3>
            <span className="text-sm text-muted-foreground">{wordCount} words</span>
          </div>
          <textarea
            className="min-h-[28rem] flex-1 resize-none bg-transparent p-4 text-base leading-7 outline-none placeholder:text-muted-foreground"
            placeholder="Paste your draft here..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>

        <div className="flex min-h-[34rem] flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">Improved text</h3>
            <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">Diff view</span>
          </div>

          {score !== null ? <NaturalnessScoreBadge score={score * 100} /> : null}
          {scoreBreakdown ? <ScoreBreakdownPanel breakdown={scoreBreakdown} /> : null}
          {score === null && output && !isProcessing ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Light mode returns immediately without a scoring pass.
            </div>
          ) : null}

          <div className="flex-1">
            {error ? (
              <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm leading-6 text-destructive">
                <span className="inline-flex max-w-md items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </span>
              </div>
            ) : isProcessing && !output ? (
              <OutputSkeleton message={progressMessage} />
            ) : output ? (
              <DiffView original={draft} revised={output} />
            ) : (
              <div className="flex min-h-[28rem] items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center text-sm leading-6 text-muted-foreground">
                Your improved text will appear here.
              </div>
            )}
          </div>

          {output ? (
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-600" />
              {isProcessing
                ? (progressMessage ?? "Streaming improved text...")
                : `Result ready${attempts ? ` after ${attempts} attempt${attempts === 1 ? "" : "s"}` : ""}${
                    perplexity ? ` - perplexity ${Math.round(perplexity)}` : ""
                  }`}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function postRewrite(token: string, text: string, mode: RewriteMode) {
  return fetch(`${apiUrl}/rewrite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, mode })
  });
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item: ApiValidationError) => {
          const location = Array.isArray(item.loc) ? item.loc.join(".") : "request";
          return item.msg ? `${location}: ${item.msg}` : null;
        })
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Request failed with status ${response.status}.`;
}

async function readRewriteStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onToken: (text: string) => void;
    onDone: (payload: RewriteDonePayload) => void;
  }
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      handleSseEvent(event, handlers);
    }
  }

  if (buffer.trim()) {
    handleSseEvent(buffer, handlers);
  }
}

async function pollRewriteJob(
  jobId: string,
  token: string,
  onProgress: (message: string) => void,
  onDone: (payload: RewriteDonePayload) => void
) {
  while (true) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500));

    const response = await fetch(`${apiUrl}/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(message);
    }

    const payload = (await response.json()) as JobStatusResponse;
    if (payload.status === "complete" && payload.result) {
      onDone(payload.result);
      return;
    }

    if (payload.status === "failed") {
      throw new Error(payload.error ?? "Rewrite job failed.");
    }

    onProgress(payload.progress?.message ?? "Processing rewrite...");
  }
}

function handleSseEvent(
  rawEvent: string,
  handlers: {
    onToken: (text: string) => void;
    onDone: (payload: RewriteDonePayload) => void;
  }
) {
  const lines = rawEvent.split("\n");
  const eventName = lines
    .find((line) => line.startsWith("event:"))
    ?.slice("event:".length)
    .trim();
  const dataLine = lines.find((line) => line.startsWith("data:"));

  if (!eventName || !dataLine) {
    return;
  }

  const payload = JSON.parse(dataLine.slice("data:".length).trim());

  if (eventName === "token" && typeof payload.text === "string") {
    handlers.onToken(payload.text);
  }

  if (eventName === "done") {
    handlers.onDone(payload as RewriteDonePayload);
  }

  if (eventName === "error" && typeof payload.message === "string") {
    throw new Error(payload.message);
  }
}

function ScoreBreakdownPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  const rows = [
    { label: "Fluency signal A", value: breakdown.gptzero },
    { label: "Fluency signal B", value: breakdown.originality }
  ].filter((row): row is { label: string; value: number } => typeof row.value === "number");

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium">{Math.round(row.value * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputSkeleton({ message }: { message: string | null }) {
  return (
    <div className="space-y-4 rounded-lg border bg-background p-4">
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-4 w-11/12 animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
