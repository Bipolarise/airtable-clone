"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import MaskIcon from "~/app/_components/MaskIcon";
import RailBtn from "~/app/_components/RailBtn";
import { IconBell } from "~/app/_icons/IconBell";
import { IconQuestion } from "~/app/_icons/IconQuestion";
import { IconSignOut } from "~/app/_icons/IconSignOut";

export default function LeftRail({
  baseName,
  baseColor = "#d4a257",
}: {
  baseName?: string | null;
  baseColor?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const { data: session } = useSession();

  const avatarUrl = session?.user?.image ?? null;
  const userInitial = (
    session?.user?.name?.[0] ?? baseName?.[0] ?? "U"
  ).toUpperCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const avatarBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuOpen) return;
      const t = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(t) &&
        avatarBtnRef.current &&
        !avatarBtnRef.current.contains(t)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col items-center border-r border-neutral-200 bg-white">
      {/* Top cluster */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <button
          className="relative mt-[3px] flex h-8 w-8 items-center justify-center rounded transition"
          title={hover ? "Back to home" : "Airtable"}
          onClick={() => router.push("/")}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label={hover ? "Back to home" : "Airtable"}
        >
          <div
            className={[
              "absolute inset-0 flex items-center justify-center transition-all duration-150",
              hover ? "translate-x-1 scale-90 opacity-0" : "translate-x-0 scale-100 opacity-100",
            ].join(" ")}
          >
            <img src="/airtable.svg" alt="Airtable" className="h-5.5 w-5.5 opacity-90" />
          </div>
          <div
            className={[
              "absolute inset-0 flex items-center justify-center transition-all duration-150",
              hover ? "translate-x-0 scale-100 opacity-100" : "-translate-x-1 scale-90 opacity-0",
            ].join(" ")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-black opacity-90 drop-shadow-[0_0_0.6px_rgba(0,0,0,0.9)]"
              aria-hidden="true"
            >
              <path
                fillRule="nonzero"
                d="M7 3C6.8674 3.00002 6.74024 3.05271 6.64648 3.14648L2.14648 7.64648C2.05271 7.74024 2.00002 7.8674 2 8C2.00002 8.1326 2.05271 8.25976 2.14648 8.35352L6.64648 12.8535C6.74025 12.9473 6.86741 12.9999 7 12.9999C7.13259 12.9999 7.25975 12.9473 7.35352 12.8535C7.44726 12.7598 7.49992 12.6326 7.49992 12.5C7.49992 12.3674 7.44726 12.2402 7.35352 12.1465L3.70703 8.5H13.5C13.6326 8.5 13.7598 8.44732 13.8536 8.35355C13.9473 8.25979 14 8.13261 14 8C14 7.86739 13.9473 7.74021 13.8536 7.64645C13.7598 7.55268 13.6326 7.5 13.5 7.5H3.70703L7.35352 3.85352C7.44726 3.75975 7.49992 3.63259 7.49992 3.5C7.49992 3.36741 7.44726 3.24025 7.35352 3.14648C7.25976 3.05271 7.1326 3.00002 7 3Z"
              />
            </svg>
          </div>
        </button>

        <div className="flex h-8 w-8 select-none items-center justify-center" title="Omni">
          <img src="/omni.png" alt="Omni" className="pointer-events-none h-7 w-7 object-contain" />
        </div>
      </div>

      {/* Utility icons */}
      <div className="mt-auto mb-2 flex flex-col items-center gap-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded text-neutral-700 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
          title="Help"
          aria-label="Help"
        >
          <IconQuestion className="h-[18px] w-[18px]" />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded text-neutral-700 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
          title="Notifications"
          aria-label="Notifications"
        >
          <IconBell className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* User bubble + popover */}
      <div className="relative mb-3">
        <button
          ref={avatarBtnRef}
          onClick={() => setMenuOpen((v) => !v)}
          className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 shadow-sm"
          title={session?.user?.name ?? "Account"}
          aria-label="Account"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={session?.user?.name ?? "Account"}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-green-600 text-[12px] font-medium text-white">
              {userInitial}
            </span>
          )}
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account menu"
            className="absolute left-10 bottom-1 w-64 select-none overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.14)]"
          >
            <div className="p-3">
              <div className="text-xs font-medium text-slate-900">
                {session?.user?.name ?? "Signed in"}
              </div>
              {session?.user?.email && (
                <div className="mt-0.5 text-xs text-slate-500">{session.user.email}</div>
              )}
            </div>

            <div className="mx-3 h-px bg-neutral-200" />

            <button
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
            >
              <IconSignOut className="h-4 w-4 shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
