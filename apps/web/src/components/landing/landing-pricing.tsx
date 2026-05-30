import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "to start",
    description: "Try the editor and see the difference on your own copy.",
    features: ["Light rewrites", "Word balance tracking", "Diff view"],
    cta: "Start free",
    href: "/sign-up",
    highlighted: false
  },
  {
    name: "Pro",
    price: "$14",
    period: "/month",
    description: "For regular writers who publish every week.",
    features: ["15,000 words / month", "Standard & Deep modes", "Naturalness scoring"],
    cta: "Get Pro",
    href: "/sign-up",
    highlighted: true
  },
  {
    name: "Unlimited",
    price: "$39",
    period: "/month",
    description: "Heavy workflows without watching the meter.",
    features: ["Unlimited rewrites", "Priority processing", "All rewrite depths"],
    cta: "Go unlimited",
    href: "/sign-up",
    highlighted: false
  }
];

type LandingPricingProps = {
  isSignedIn: boolean;
};

export function LandingPricing({ isSignedIn }: LandingPricingProps) {
  return (
    <section id="pricing" className="border-t bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Pricing</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Simple plans, no surprises</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when your volume grows. Credit packs available anytime.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "flex h-full flex-col",
                plan.highlighted && "border-accent/40 shadow-md ring-1 ring-accent/20"
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.highlighted ? <Badge variant="accent">Popular</Badge> : null}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-6">
                <ul className="space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <Check className="h-3 w-3" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                  <Link href={isSignedIn ? "/account" : plan.href}>{isSignedIn ? "Manage plan" : plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
