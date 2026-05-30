import Link from "next/link";
import { Button } from "@/components/ui/button";

type LandingFooterProps = {
  isSignedIn: boolean;
};

export function LandingFooter({ isSignedIn }: LandingFooterProps) {
  return (
    <footer className="border-t py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 text-center lg:px-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Ready to sound like yourself again?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Join writers who use Humaniser to ship copy that reads human, not generated.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>{isSignedIn ? "Open editor" : "Start writing for free"}</Link>
        </Button>
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Humaniser. All rights reserved.</p>
      </div>
    </footer>
  );
}
