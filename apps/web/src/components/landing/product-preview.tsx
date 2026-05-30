import { ArrowRight, Gauge } from "lucide-react";

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_-24px_rgba(23,23,23,0.18)] ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8A598]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8D4A0]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#A8C5A0]" />
          <span className="ml-2 text-xs text-muted-foreground">Humaniser rewrite workspace</span>
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b p-5 md:border-b-0 md:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Before</p>
            <p className="text-sm leading-7 text-muted-foreground">
              It is important to note that the implementation of this strategy will leverage synergies across multiple
              verticals in order to optimize outcomes.
            </p>
          </div>
          <div className="bg-[#FDFBF7] p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">After</p>
            <p className="text-sm leading-7 text-foreground">
              This approach works best when teams align on priorities early, then each group can move faster without
              stepping on each other&apos;s work.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Naturalness</span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">87%</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Standard rewrite
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
