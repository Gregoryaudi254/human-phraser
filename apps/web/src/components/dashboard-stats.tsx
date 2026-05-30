"use client";

import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats as DashboardStatsType, fetchDashboardStats } from "@/lib/api";

export function DashboardStats() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DashboardStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const result = await fetchDashboardStats(token);
        if (isMounted) {
          setStats(result);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border-b bg-card/60 px-4 py-3 text-sm text-muted-foreground lg:px-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading stats...
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <section className="grid gap-4 border-b bg-card/60 p-4 md:grid-cols-3 lg:p-6">
      <StatCard label="Rewrites this month" value={stats.total_rewrites_month.toLocaleString()} />
      <StatCard
        label="Average naturalness"
        value={stats.average_naturalness_score === null ? "No score" : `${Math.round(stats.average_naturalness_score * 100)}%`}
      />
      <StatCard
        label="Words used this month"
        value={
          stats.plan_limit_words === null
            ? `${stats.words_used_month.toLocaleString()} / Unlimited`
            : `${stats.words_used_month.toLocaleString()} / ${stats.plan_limit_words.toLocaleString()}`
        }
      />
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
