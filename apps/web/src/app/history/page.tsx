"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { Copy, Loader2, RefreshCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DiffView } from "@/components/diff-view";
import { Button } from "@/components/ui/button";
import { deleteRewrite, fetchRewriteHistory, RewriteHistoryPage, RewriteRecord } from "@/lib/api";

export default function HistoryPage() {
  const { getToken } = useAuth();
  const [history, setHistory] = useState<RewriteHistoryPage | null>(null);
  const [selected, setSelected] = useState<RewriteRecord | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }
        const result = await fetchRewriteHistory(token, page);
        if (isMounted) {
          setHistory(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load history");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [getToken, page]);

  async function handleDelete(rewrite: RewriteRecord) {
    const token = await getToken();
    if (!token) {
      setError("Missing auth token");
      return;
    }
    await deleteRewrite(token, rewrite.id);
    setSelected(null);
    setHistory((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.id !== rewrite.id),
            total: Math.max(0, current.total - 1)
          }
        : current
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Humaniser</p>
            <h1 className="text-lg font-semibold">History</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="grid md:grid-cols-[220px_1fr]">
        <DashboardSidebar />
        <section className="space-y-5 p-4 lg:p-6">
          <div>
            <h2 className="text-xl font-semibold">Past rewrites</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review earlier drafts, compare changes, and send one back to the editor.</p>
          </div>

          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {isLoading ? (
              <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history...
              </div>
            ) : history && history.items.length > 0 ? (
              <div className="divide-y">
                {history.items.map((rewrite) => (
                  <button
                    key={rewrite.id}
                    type="button"
                    onClick={() => setSelected(rewrite)}
                    className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-muted/60 md:grid-cols-[9rem_6rem_6rem_1fr]"
                  >
                    <span className="text-sm text-muted-foreground">{new Date(rewrite.created_at).toLocaleDateString()}</span>
                    <span className="text-sm font-medium capitalize">{rewrite.mode}</span>
                    <span className="text-sm">{rewrite.words_used} words</span>
                    <span className="truncate text-sm text-muted-foreground">{rewrite.original_text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-60 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                No rewrites yet.
              </div>
            )}
          </div>

          {history ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {history.page} of {history.total_pages}
              </span>
              <Button variant="outline" disabled={page >= history.total_pages || isLoading} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {selected ? <RewriteModal rewrite={selected} onClose={() => setSelected(null)} onDelete={() => handleDelete(selected)} /> : null}
    </main>
  );
}

function RewriteModal({ rewrite, onClose, onDelete }: { rewrite: RewriteRecord; onClose: () => void; onDelete: () => void }) {
  const score = useMemo(
    () => (rewrite.naturalness_score === null ? "Not scored" : `${Math.round(rewrite.naturalness_score * 100)}%`),
    [rewrite.naturalness_score]
  );

  function reImprove() {
    window.localStorage.setItem("humaniser:re-improve-text", rewrite.original_text);
    window.location.href = "/dashboard";
  }

  async function copyText() {
    await navigator.clipboard.writeText(rewrite.rewritten_text);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="font-semibold">Rewrite details</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(rewrite.created_at).toLocaleString()} · {rewrite.mode} · {score}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[65vh] space-y-4 overflow-auto p-4">
          <DiffView original={rewrite.original_text} revised={rewrite.rewritten_text} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextPanel title="Original" text={rewrite.original_text} />
            <TextPanel title="Rewritten" text={rewrite.rewritten_text} />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t p-4">
          <Button variant="outline" className="gap-2" onClick={reImprove}>
            <RefreshCcw className="h-4 w-4" />
            Re-improve
          </Button>
          <Button variant="outline" className="gap-2" onClick={copyText}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function TextPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h4 className="mb-3 text-sm font-medium">{title}</h4>
      <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{text}</p>
    </section>
  );
}
