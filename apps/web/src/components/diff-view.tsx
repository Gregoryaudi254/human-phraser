"use client";

import { diff_match_patch } from "diff-match-patch";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type DiffViewProps = {
  original: string;
  revised: string;
  className?: string;
};

const dmp = new diff_match_patch();

export function DiffView({ original, revised, className }: DiffViewProps) {
  const diffs = useMemo(() => {
    const result = dmp.diff_main(original, revised);
    dmp.diff_cleanupSemantic(result);
    return result;
  }, [original, revised]);

  return (
    <div className={cn("min-h-[18rem] max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-7", className)}>
      {diffs.map(([operation, text], index) => (
        <span
          key={`${operation}-${index}-${text.slice(0, 12)}`}
          className={cn(
            operation === 1 && "rounded bg-emerald-100 px-0.5 text-emerald-900",
            operation === -1 && "rounded bg-red-100 px-0.5 text-red-800 line-through",
            operation === 0 && "text-foreground"
          )}
        >
          {text}
        </span>
      ))}
    </div>
  );
}
