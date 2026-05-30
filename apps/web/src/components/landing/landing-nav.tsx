"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" }
];

type LandingNavProps = {
  isSignedIn: boolean;
};

export function LandingNav({ isSignedIn }: LandingNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            H
          </span>
          <span className="font-semibold tracking-tight">Humaniser</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href={isSignedIn ? "/dashboard" : "/sign-in"}>{isSignedIn ? "Dashboard" : "Sign in"}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>{isSignedIn ? "Open editor" : "Start free"}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        className={cn(
          "border-t bg-background md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t pt-4">
            <Button asChild variant="outline" size="sm">
              <Link href={isSignedIn ? "/dashboard" : "/sign-in"}>{isSignedIn ? "Dashboard" : "Sign in"}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>{isSignedIn ? "Open editor" : "Start free"}</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
