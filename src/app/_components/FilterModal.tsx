// src/app/_components/FilterModal.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FilterModalProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** Parent will unmount this and mount AddConditionModal instead */
  onRequestAddCondition: () => void;
};

export default function FilterModal({
  anchorEl,
  onClose,
  onRequestAddCondition,
}: FilterModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: Math.max(8, rect.left) });
  }, [anchorEl]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!panelRef.current) return;
      const t = e.target as Node;
      if (anchorEl?.contains(t)) return;
      if (!panelRef.current.contains(t)) onClose();
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onWinMove() {
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.max(8, r.left) });
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKey);
    window.addEventListener("resize", onWinMove, { passive: true });
    window.addEventListener("scroll", onWinMove, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKey);
      window.removeEventListener("resize", onWinMove);
      window.removeEventListener("scroll", onWinMove);
    };
  }, [anchorEl, onClose]);

  const HelpIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" className="inline-block align-[-2px]">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2 2.2-2 3.7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="17.2" r="1" />
    </svg>
  );

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Filter"
      className="fixed z-50 w-[420px] rounded-lg border border-neutral-200 bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="px-4 py-3">
        <div className="mb-2 text-[13px] text-neutral-500">
          No filter conditions are applied <span className="text-neutral-400">{HelpIcon}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Replace panel on click */}
          <button
            type="button"
            onClick={onRequestAddCondition}
            className="text-[13px] text-neutral-600 hover:text-blue-600 focus:text-blue-600 active:text-blue-700 transition-colors"
          >
            + Add condition
          </button>

          {/* Inert for now */}
          <button
            type="button"
            className="text-[13px] text-neutral-600 hover:text-neutral-700 transition-colors"
            title="Coming soon"
          >
            + Add condition group
          </button>

          <span className="ml-1 text-neutral-400">{HelpIcon}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
