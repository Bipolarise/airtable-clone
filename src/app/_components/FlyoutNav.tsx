// src/app/_components/FlyoutNav.tsx
"use client";

import { useEffect, useRef } from "react";

// Same icons used in Sidebar
import { IconHouse } from "~/app/_icons/IconHouse";
import { IconStar } from "~/app/_icons/IconStar";
import { IconShare } from "~/app/_icons/IconShare";
import { IconUsersThree } from "~/app/_icons/IconUsersThree";
import { IconBookOpen } from "~/app/_icons/IconBookOpen";
import { IconShoppingBagOpen } from "~/app/_icons/IconShoppingBagOpen";
import { IconUploadSimple } from "~/app/_icons/IconUploadSimple";

type FlyoutNavProps = {
  open: boolean;
  onClose: () => void;

  /** Clicks on this element will NOT close the flyout (use for the toggle button). */
  ignoreRef?: React.RefObject<HTMLElement | null>; // <- allow null

  /** Height of the header in px so the rail sits below it. Default: 56 (Tailwind h-14). */
  offsetTop?: number;

  /** Rail width in px (keep this in sync with HomeShell’s RAIL_W). Default: 56 */
  width?: number;
};

export default function FlyoutNav({
  open,
  onClose,
  ignoreRef,
  offsetTop = 56,
  width = 56,
}: FlyoutNavProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on outside click (panel + toggle ref are ignored)
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;        // click inside rail
      if (ignoreRef?.current && ignoreRef.current.contains(t)) return; // click on toggle
      onClose();
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, ignoreRef]);

  // Optional body lock
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    // Wrapper does NOT block the page (no scrim, pointer-events none)
    <div
      aria-hidden={!open}
      className="fixed left-0 z-30 pointer-events-none"
      style={{ top: offsetTop, height: `calc(100dvh - ${offsetTop}px)` }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
        className={`pointer-events-auto h-full border-r border-neutral-200 bg-white transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width }}
      >
        <nav className="flex h-full flex-col items-center text-neutral-700">
          {/* Top group — tight spacing */}
          <div className="mt-3 flex flex-col items-center gap-3">
            <IconButton label="Home" selected>
              <IconHouse />
            </IconButton>
            <IconButton label="Starred">
              <IconStar />
            </IconButton>
            <IconButton label="Shared">
              <IconShare />
            </IconButton>
            <IconButton label="Workspaces">
              <IconUsersThree />
            </IconButton>
          </div>

          {/* Divider */}
          <div className="mt-3 h-px w-10 bg-neutral-200" />

          {/* Spacer to push bottom set down */}
          <div className="flex-1" />

          {/* Divider above bottom utilities */}
          <div className="mb-3 h-px w-10 bg-neutral-200" />

          {/* Bottom utilities — tight spacing & muted */}
          <div className="mb-3 flex flex-col items-center gap-3 text-neutral-400">
            <IconButton label="Templates & apps" muted>
              <IconBookOpen />
            </IconButton>
            <IconButton label="Marketplace" muted>
              <IconShoppingBagOpen />
            </IconButton>
            <IconButton label="Import" muted>
              <IconUploadSimple />
            </IconButton>
          </div>

          {/* Plus button on floor */}
          <div className="mb-3">
            <PlusButton />
          </div>
        </nav>
      </div>
    </div>
  );
}

function IconButton({
  label,
  children,
  selected = false,
  muted = false,
}: {
  label: string;
  children: React.ReactNode;
  selected?: boolean;
  muted?: boolean;
}) {
  const base = "group relative inline-flex h-8 w-8 items-center justify-center rounded-md";
  const state = selected
    ? "text-neutral-900"
    : muted
      ? "text-neutral-400 hover:bg-neutral-50"
      : "text-neutral-700 hover:bg-neutral-100";

  return (
    <button className={`${base} ${state}`} title={label} aria-label={label}>
      <span className="inline-flex h-4 w-4 items-center justify-center">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function PlusButton() {
  return (
    <button
      title="Create"
      aria-label="Create"
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
