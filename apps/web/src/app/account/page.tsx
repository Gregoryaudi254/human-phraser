"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { Loader2, Wallet } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingAccount, createCheckout, fetchBillingAccount } from "@/lib/api";

export default function AccountPage() {
  const { getToken } = useAuth();
  const [billing, setBilling] = useState<BillingAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBilling() {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }
        const account = await fetchBillingAccount(token);
        if (isMounted) {
          setBilling(account);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load billing");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBilling();
    return () => {
      isMounted = false;
    };
  }, [getToken]);

  async function redirectToCheckout(kind: "pro" | "unlimited" | "credits") {
    setPendingAction(kind);
    try {
      posthog.capture(kind === "credits" ? "credits_purchased" : "upgrade_clicked", { kind });
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }
      window.location.href = await createCheckout(token, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-4 lg:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Humaniser</p>
            <h1 className="text-xl font-semibold">Account</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] md:grid-cols-[220px_1fr]">
        <DashboardSidebar />
        <section className="space-y-6 p-4 lg:p-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading billing...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : billing ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Current plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold capitalize">{billing.plan}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {billing.renewal_date ? `Renews ${new Date(billing.renewal_date).toLocaleDateString()}` : "No renewal date"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Word balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{billing.balance_words.toLocaleString()}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Available rewrite words</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Pro allowance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{billing.pro_monthly_words.toLocaleString()}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Words per month</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <PlanCard
                  title="Pro"
                  price="$14/month"
                  body="15,000 words each month for regular rewriting work."
                  action="Upgrade"
                  loading={pendingAction === "pro"}
                  onClick={() => redirectToCheckout("pro")}
                />
                <PlanCard
                  title="Unlimited"
                  price="$39/month"
                  body="Unlimited rewriting for heavier workflows."
                  action="Upgrade"
                  loading={pendingAction === "unlimited"}
                  onClick={() => redirectToCheckout("unlimited")}
                />
                <PlanCard
                  title="Credit pack"
                  price="$5"
                  body="Add 5,000 extra words without changing plans."
                  action="Buy credits"
                  loading={pendingAction === "credits"}
                  onClick={() => redirectToCheckout("credits")}
                />
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function PlanCard({
  title,
  price,
  body,
  action,
  loading,
  onClick
}: {
  title: string;
  price: string;
  body: string;
  action: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-semibold">{price}</p>
          <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
        <Button className="w-full gap-2" onClick={onClick} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}
