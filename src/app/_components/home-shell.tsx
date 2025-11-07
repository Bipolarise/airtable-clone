// src/app/_components/home-shell.tsx
"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import Sidebar from "./Sidebar";
import BaseCard from "./BaseCard";
import { IconBell } from "~/app/_icons/IconBell";
import { IconQuestion } from "~/app/_icons/IconQuestion";
import FlyoutNav from "./FlyoutNav";

const HEADER_H = 56; // h-14
const RAIL_W = 60;   // quick rail width

export default function HomeShell() {
  const { data: session, status } = useSession();
  const [navOpen, setNavOpen] = useState(false);

  const { data: bases, isLoading } = api.base.listMine.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const userInitial = useMemo(() => {
    const n = session?.user?.name?.[0];
    const e = session?.user?.email?.[0];
    return (n ?? e ?? "U").toUpperCase();
  }, [session?.user?.name, session?.user?.email]);

  const goGoogle = () => void signIn("google", { callbackUrl: "/" });
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/api/auth/signin?callbackUrl=/" });
  };

  // Ctrl/Cmd+K focus search
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
      const combo = (isMac && e.metaKey) || (!isMac && e.ctrlKey);
      if (isK && combo) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Ignore outside-click for this toggle button
  const toggleRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col overflow-hidden">
      {/* Header — box-border so the 1px border doesn't add height */}
      <header className="sticky top-0 z-40 w-full h-14 box-border border-b border-neutral-200 bg-white">
        <div className="w-full h-full px-3 sm:px-4">
          <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* LEFT: Menu + Brand */}
            <div className="flex items-center gap-3">
              <button
                ref={toggleRef}
                onClick={() => setNavOpen((o) => !o)}
                aria-label="Toggle navigation"
                aria-expanded={navOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-neutral-100"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="flex items-center gap-2.5">
                <Image src="/airtable-favicon.ico" alt="Airtable" width={28} height={28} />
                <span className="text-[18px] font-semibold tracking-[-0.01em]">Airtable</span>
              </div>
            </div>

            {/* CENTER: Search */}
            <div className="flex w-full justify-center">
              <label className="flex w-full max-w-[360px] items-center rounded-full border border-neutral-300 bg-white pl-3 pr-3 py-0.5">
                <svg
                  width="16"
                  height="16"
                  className="mr-2 shrink-0 opacity-60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchRef}
                  placeholder="Search..."
                  title="Search (Ctrl/⌘ + K)"
                  className="h-7 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none focus:outline-none"
                />
                <span className="ml-3 shrink-0 whitespace-nowrap text-[10.5px] text-neutral-600">
                  ctrl K
                </span>
              </label>
            </div>

            {/* RIGHT: Help + Bell + User */}
            <div className="ml-auto flex items-center justify-end gap-2.5">
              <button
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] text-neutral-800 hover:bg-neutral-50"
                title="Help"
              >
                <IconQuestion className="h-4 w-4" />
                <span>Help</span>
              </button>

              <button
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:bg-neutral-50"
                aria-label="Notifications"
                title="Notifications"
              >
                <IconBell className="h-4 w-4" />
              </button>

              {status === "loading" && <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />}

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
      </header>

      {/* Flyout rail (no scrim) */}
      <FlyoutNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        ignoreRef={toggleRef}
        offsetTop={HEADER_H}
        width={RAIL_W}
      />

      {/* MAIN AREA — fills the viewport below the header, no page scroll */}
      <div
        className="grid min-h-0 h-[calc(100dvh-56px)] overflow-hidden transition-all duration-150"
        style={{
          gridTemplateColumns: navOpen ? "1fr" : "240px 1fr",
          paddingLeft: navOpen ? RAIL_W : 0,
        }}
      >
        {!navOpen && (
          <aside className="border-r border-neutral-200 overflow-hidden">
            <Sidebar />
          </aside>
        )}

        {/* Only this column scrolls */}
        <main className="min-h-0 h-full overflow-auto px-6 py-5 min-w-0">
          <h1 className="mb-3 text-[22px] font-semibold">Home</h1>

          {status === "loading" && (
            <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
              Checking session…
            </div>
          )}

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

          {status === "authenticated" && (
            <>
              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[15px] font-semibold">
                      Upgrade to the Team plan before your trial expires in{" "}
                      <span className="text-blue-600">9 days</span>
                    </div>
                    <div className="mt-1 text-[13px] text-neutral-600">
                      Keep the power you need to manage complex workflows, design interfaces, and
                      more.
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
        </main>
      </div>
    </div>
  );
}

/* Small presentational bits */
function QuickCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
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
