import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingDemo } from "@/components/landing/landing-demo";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPricing } from "@/components/landing/landing-pricing";

export default async function HomePage() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  if (isSignedIn) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <LandingNav isSignedIn={isSignedIn} />
      <main>
        <LandingDemo isSignedIn={isSignedIn} />
        <LandingHero isSignedIn={isSignedIn} />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing isSignedIn={isSignedIn} />
      </main>
      <LandingFooter isSignedIn={isSignedIn} />
    </div>
  );
}
