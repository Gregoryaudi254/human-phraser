"use client";

import Link from "next/link";
import { Loader2, MoveRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { DiffView } from "@/components/diff-view";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api-url";

const apiUrl = getApiUrl();

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function fingerprint() {
  return [navigator.userAgent, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join("|");
}

export function LandingDemo({ isSignedIn }: { isSignedIn: boolean }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const words = useMemo(() => wordCount(text), [text]);

  async function runDemo() {
    setIsLoading(true);
    setResult("");
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/demo/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fingerprint: fingerprint() })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "Demo rewrite failed.");
      }
      setResult(payload.rewritten_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo rewrite failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section id="demo" className="pt-28 pb-16 md:pt-32 md:pb-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Humaniser live demo</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            Write like a human. Every time.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Paste up to 200 words and turn a stiff draft into clearer, more natural prose. No sample text, no credit card.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex min-h-[30rem] flex-col rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
              <span className="font-medium">Draft</span>
              <span className={words > 200 ? "text-destructive" : "text-muted-foreground"}>{words}/200 words</span>
            </div>
            <textarea
              className="min-h-[24rem] flex-1 resize-none bg-transparent p-4 text-base leading-7 outline-none placeholder:text-muted-foreground"
              placeholder="Paste your draft here..."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>

          <div className="flex min-h-[30rem] flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Improved text</span>
              <Button className="gap-2" disabled={isLoading || words === 0 || words > 200} onClick={runDemo}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Improve
              </Button>
            </div>

            {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

            {isLoading ? (
              <div className="space-y-4 rounded-lg border bg-background p-4">
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            ) : result ? (
              <DiffView original={text} revised={result} className="max-h-[24rem] flex-1 overflow-y-auto" />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background p-6 text-center text-sm leading-6 text-muted-foreground">
                Your improved text will appear here.
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
              <Button asChild className="gap-2">
                <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                  {isSignedIn ? "Open editor" : "Sign up to save"}
                  <MoveRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">One free demo per day. Sign up for 200 free words.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
