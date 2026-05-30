import Link from "next/link";
import { MoveRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/landing/product-preview";

type LandingHeroProps = {
  isSignedIn: boolean;
};

export function LandingHero({ isSignedIn }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden border-t py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16 lg:px-6">
        <div className="flex flex-col gap-6">
          <Badge variant="accent" className="w-fit gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            Writing quality, not word spinning
          </Badge>

          <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
            Turn stiff drafts into prose people actually want to read.
          </h1>

          <p className="max-w-lg text-lg leading-8 text-muted-foreground">
            Humaniser rewrites your text for clarity, rhythm, and voice, with depth controls from light polish to a full
            editorial pass. Built for founders, marketers, and anyone tired of robotic copy.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gap-2">
              <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                {isSignedIn ? "Go to editor" : "Try it free"}
                <MoveRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#demo">Try the demo</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required. Light, Standard and Deep rewrite modes.
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
