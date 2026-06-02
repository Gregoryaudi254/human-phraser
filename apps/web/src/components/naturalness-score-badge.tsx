"use client";

import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type NaturalnessScoreBadgeProps = {
  score: number;
};

function getScoreStyles(score: number) {
  if (score < 60) {
    return {
      stroke: "stroke-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200"
    };
  }

  if (score < 80) {
    return {
      stroke: "stroke-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200"
    };
  }

  return {
    stroke: "stroke-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200"
  };
}

export function NaturalnessScoreBadge({ score }: NaturalnessScoreBadgeProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const [animatedScore, setAnimatedScore] = useState(0);
  const styles = useMemo(() => getScoreStyles(normalizedScore), [normalizedScore]);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimatedScore(normalizedScore));
    return () => window.cancelAnimationFrame(frame);
  }, [normalizedScore]);

  return (
    <div className={cn("flex items-center gap-4 rounded-lg border p-4", styles.bg, styles.border)}>
      <div className="relative h-24 w-24 shrink-0">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="stroke-white/80" cx="50" cy="50" r={radius} fill="none" strokeWidth="9" />
          <circle
            className={cn("transition-all duration-700 ease-out", styles.stroke)}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeLinecap="round"
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-xl font-semibold", styles.text)}>
          {animatedScore}%
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">Naturalness score</p>
          <span className="group relative inline-flex">
            <Info className="h-4 w-4 text-muted-foreground" aria-label="Naturalness score details" />
            <span className="pointer-events-none absolute right-0 top-6 z-10 hidden w-64 rounded-md border bg-card p-3 text-xs leading-5 text-card-foreground shadow-lg group-hover:block">
              This score reflects how naturally and fluidly the text reads, using external scoring APIs when configured or a local perplexity signal as fallback.
            </span>
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {normalizedScore >= 80 ? "Strong, fluid result" : normalizedScore >= 60 ? "Readable, with room to polish" : "Needs more rewriting"}
        </p>
      </div>
    </div>
  );
}
