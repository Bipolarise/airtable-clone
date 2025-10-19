// src/app/_components/home-shell.tsx
"use client";

import { useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import Sidebar from "./Sidebar";
import BaseCard from "./BaseCard";

export default function HomeShell() {
  const { data: session, status } = useSession(); // "loading" | "authenticated" | "unauthenticated"

  // Only call protected tRPC once we are authenticated
  const { data: bases, isLoading } = api.base.listMine.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  // Avatar fallback initial
  const userInitial = useMemo(() => {
    const n = session?.user?.name?.[0];
    const e = session?.user?.email?.[0];
    return (n ?? e ?? "U").toUpperCase();
  }, [session?.user?.name, session?.user?.email]);

  // Always land on "/" after Google sign-in
  const goGoogle = () => {
    void signIn("google", { callbackUrl: "/" });
  };

  // Sign out, then show the NextAuth sign-in screen with a callback back to "/"
  const handleSignOut = async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/api/auth/signin?callbackUrl=/",
    });
  };

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-neutral-100 text-neutral-900">
      {/* LEFT: Sidebar */}
      <Sidebar />

      {/* RIGHT: Main */}
      <div className="flex min-h-screen flex-col">
        {/* Header: centered search, auth on the right */}
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="mx-auto w-full max-w-[1160px]">
            <div className="grid h-12 grid-cols-[1fr_auto] items-center gap-3 px-3 sm:px-4">
              {/* CENTERED SEARCH */}
              <div className="flex w-full justify-center">
                <div className="flex w-full max-w-[560px] items-center rounded-full border border-neutral-300 bg-neutral-50 pl-3 pr-2">
                  <svg
                    width="18"
                    height="18"
                    className="mr-2 shrink-0 opacity-60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    placeholder="Search..."
                    className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                  />
                  <span className="ml-2 shrink-0 whitespace-nowrap text-[11px] text-neutral-600">
                    ctrl K
                  </span>
                </div>
              </div>

              {/* RIGHT ACTIONS */}
              <div className="ml-auto flex items-center justify-end gap-2">
                <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] hover:bg-neutral-50">
                  Help
                </button>

                {/* User menu / auth actions */}
                {status === "loading" && (
                  <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />
                )}

                {status === "unauthenticated" && (
                  <button
                    onClick={goGoogle}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] hover:bg-neutral-50"
                  >
                    Sign in
                  </button>
                )}

                {status === "authenticated" && (
                  <details className="relative">
                    <summary className="list-none cursor-pointer">
                      {session?.user?.image ? (
                        // Use <img> so we don't need next.config image domains
                        <img
                          src={session.user.image}
                          alt={session?.user?.name ?? "User"}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-neutral-300 text-center leading-8 text-white">
                          {userInitial}
                        </div>
                      )}
                    </summary>

                    <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
                      <div className="px-3 py-2">
                        <div className="truncate text-[13px] font-medium">
                          {session?.user?.name ?? "Signed in"}
                        </div>
                        <div className="truncate text-[12px] text-neutral-500">
                          {session?.user?.email}
                        </div>
                      </div>
                      <div className="h-px bg-neutral-200" />
                      <button
                        className="w-full px-3 py-2 text-left text-[13px] hover:bg-neutral-50"
                        onClick={handleSignOut}
                      >
                        Sign out
                      </button>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content container */}
        <div className="mx-auto w-full max-w-[1060px] px-6 py-5">
          {/* Page title below header */}
          <h1 className="mb-3 text-[22px] font-semibold">Home</h1>

          {/* If session is loading */}
          {status === "loading" && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
              Checking session…
            </div>
          )}

          {/* If signed out, show CTA */}
          {status === "unauthenticated" && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold">You’re signed out</div>
                  <div className="mt-1 text-[13px] text-neutral-600">
                    Sign in to view and manage your bases.
                  </div>
                </div>
                <button
                  onClick={goGoogle}
                  className="rounded-md bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90"
                >
                  Sign in with Google
                </button>
              </div>
            </div>
          )}

          {/* Authenticated content */}
          {status === "authenticated" && (
            <>
              {/* Banner */}
              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[15px] font-semibold">
                      Upgrade to the Team plan before your trial expires in{" "}
                      <span className="text-blue-600">9 days</span>
                    </div>
                    <div className="mt-1 text-[13px] text-neutral-600">
                      Keep the power you need to manage complex workflows, design
                      interfaces, and more.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-md bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90">
                      Upgrade
                    </button>
                    <button className="rounded-md border border-neutral-300 px-3 py-2 text-[13px] hover:bg-neutral-50">
                      Compare plans
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick cards */}
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <QuickCard
                  icon={<Spark />}
                  title="Start with Omni"
                  desc="Use AI to build a custom app tailored to your workflow."
                />
                <QuickCard
                  icon={<GridIcon />}
                  title="Start with templates"
                  desc="Select a template to get started and customize as you go."
                />
                <QuickCard
                  icon={<Upload />}
                  title="Quickly upload"
                  desc="Easily migrate your existing projects in just a few minutes."
                />
              </div>

              {/* Opened anytime */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[13px] text-neutral-700">Opened anytime ▾</div>
                  <div className="flex items-center gap-2 text-neutral-500">
                    <button className="rounded p-1 hover:bg-neutral-100" title="List view">
                      <List />
                    </button>
                    <button className="rounded p-1 hover:bg-neutral-100" title="Grid view">
                      <Grid />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <BaseCard.Skeleton key={i} />)
                    : (bases ?? []).map((b) => <BaseCard key={b.id} base={b} />)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small presentational bits ---------- */

function QuickCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-neutral-600">
          {icon}
        </span>
        <div>
          <div className="text-[13px] font-medium">{title}</div>
          <div className="mt-1 text-[12.5px] leading-5 text-neutral-600">{desc}</div>
        </div>
      </div>
    </div>
  );
}

/* icons */
function Spark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function Upload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function List() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}
function Grid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
