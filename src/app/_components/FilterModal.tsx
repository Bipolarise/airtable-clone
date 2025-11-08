// src/app/_components/FilterModal.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconQuestion } from "~/app/_icons/IconQuestion";

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

  // --- helper: compute left so the RIGHT edges align ---
  const updatePos = () => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();

    // Use actual rendered width if available; otherwise fall back to the fixed class width.
    const panelW = panelRef.current?.offsetWidth ?? 420;

    const padding = 8; // min gutter from viewport edges
    const top = r.bottom + 8;

    // Align right edges: left = anchor.right - panelWidth
    let left = r.right - panelW;

    // Clamp to viewport (avoid offscreen)
    left = Math.max(padding, Math.min(window.innerWidth - panelW - padding, left));

    setPos({ top, left });
  };

  // Initial position (after anchor exists)
  useLayoutEffect(() => {
    if (!anchorEl) return;
    updatePos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  // Reposition on outside interactions / keys
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
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [anchorEl, onClose]);

  // Reposition on resize/scroll
  useEffect(() => {
    if (!anchorEl) return;
    const onWinMove = () => updatePos();
    window.addEventListener("resize", onWinMove, { passive: true });
    window.addEventListener("scroll", onWinMove, { passive: true });
    return () => {
      window.removeEventListener("resize", onWinMove);
      window.removeEventListener("scroll", onWinMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  // Reposition if the panel's measured width changes (e.g., fonts load)
  useEffect(() => {
    if (!panelRef.current) return;
    const ro = new ResizeObserver(() => updatePos());
    ro.observe(panelRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef.current]);

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
          No filter conditions are applied{" "}
          <button
            type="button"
            title="Help"
            aria-label="Help"
            className="ml-1 inline-flex align-[-2px] rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <IconQuestion className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Replace panel on click */}
          <button
            type="button"
            onClick={onRequestAddCondition}
            className="text-[13px] text-neutral-600 transition-colors hover:text-blue-600 focus:text-blue-600 active:text-blue-700"
          >
            + Add condition
          </button>

          {/* Still clickable here (only disabled in AddConditionModal if you want) */}
          <button
            type="button"
            className="text-[13px] text-neutral-600 transition-colors hover:text-blue-600 focus:text-blue-600 active:text-blue-700"
            title="Coming soon"
          >
            + Add condition group
          </button>

          <button
            type="button"
            title="Help"
            aria-label="Help"
            className="ml-1 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <IconQuestion className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
