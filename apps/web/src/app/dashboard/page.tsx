"use client";

import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { EditorShell } from "@/components/editor-shell";
import { CurrentUser, fetchCurrentUser } from "@/lib/api";

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setError(null);
        const token = await getToken();
        if (!token) {
          throw new Error("Your session is still starting. Refresh the page in a moment.");
        }
        let currentUser: CurrentUser;
        try {
          currentUser = await fetchCurrentUser(token);
        } catch (err) {
          if (!(err instanceof Error) || err.message !== "Invalid token") {
            throw err;
          }

          const freshToken = await getToken({ skipCache: true });
          if (!freshToken) {
            throw err;
          }
          currentUser = await fetchCurrentUser(freshToken);
        }
        if (isMounted) {
          setProfile(currentUser);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load profile");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-4 lg:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Humaniser</p>
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs leading-5 text-muted-foreground sm:block">
              {isLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing
                </span>
              ) : error ? (
                <span>Backend unavailable</span>
              ) : (
                <>
                  <span className="block text-foreground">{user?.fullName ?? profile?.email}</span>
                  <span>{profile?.balance_words.toLocaleString()} words left</span>
                </>
              )}
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] md:grid-cols-[220px_1fr]">
        <DashboardSidebar />
        <div>
          <EditorShell />
        </div>
      </div>
    </main>
  );
}
