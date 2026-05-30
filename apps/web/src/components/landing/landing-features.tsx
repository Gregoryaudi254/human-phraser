import { Diff, Layers, PenLine, ShieldCheck, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: PenLine,
    title: "Three rewrite depths",
    description: "Light touch-ups, standard editorial passes, or deep rewrites that chase a naturalness score.",
    className: "md:col-span-2 md:row-span-2"
  },
  {
    icon: Diff,
    title: "Side-by-side diff",
    description: "Compare every change before you publish.",
    className: "md:col-span-1"
  },
  {
    icon: Zap,
    title: "Fast on long drafts",
    description: "Queue heavy jobs and stream results when they are ready.",
    className: "md:col-span-1"
  },
  {
    icon: ShieldCheck,
    title: "Your voice, preserved",
    description: "Meaning stays intact. We improve how it reads, not what it says.",
    className: "md:col-span-2"
  },
  {
    icon: Layers,
    title: "Word credits that scale",
    description: "Free tier to start, Pro for teams, Unlimited when volume spikes.",
    className: "md:col-span-1"
  }
];

export function LandingFeatures() {
  return (
    <section id="features" className="border-t bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Features</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to publish with confidence
          </h2>
          <p className="mt-4 text-muted-foreground">
            A focused editor, not another bloated AI suite. Paste, improve, compare, publish.
          </p>
        </div>

        <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className={cn("h-full border-border/80 bg-card/90", feature.className)}>
                <CardHeader className="pb-2">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
