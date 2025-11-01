// src/app/_components/SearchResultsModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Match = {
  rowId: string;
  colId: string;
  rowIndex: number;
  colIndex: number;
  title?: string;
};

export default function SearchResultsModal({
  open,
  term,
  matches,
  hitIndex,
  onPrev,
  onNext,
  onGoto,
  onClose,
  onTermChange,
}: {
  open: boolean;
  term: string;
  matches: Match[];
  hitIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onGoto: (i: number) => void;
  onClose: () => void;
  onTermChange: (v: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number>(80); // fallback if header not found

  // ---- Keep latest handlers in refs (prevents changing effect deps) ----
  const handlersRef = useRef({
    onPrev,
    onNext,
    onGoto,
    onClose,
    hitIndex,
  });
  handlersRef.current.onPrev = onPrev;
  handlersRef.current.onNext = onNext;
  handlersRef.current.onGoto = onGoto;
  handlersRef.current.onClose = onClose;
  handlersRef.current.hitIndex = hitIndex;

  // ---- Anchor under the ViewHeaderBar (no prop needed) ----
  useEffect(() => {
    if (!open) return;

    const calc = () => {
      const btn = document.querySelector<HTMLButtonElement>(
        'button[title="Insert demo rows"]'
      );
      const header = btn?.closest<HTMLDivElement>("div.border-b");
      if (header) {
        const r = header.getBoundingClientRect();
        setTop(Math.round(r.bottom + 8)); // 8px gap
      } else {
        setTop(80);
      }
    };

    calc();
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, opts);

    const ro = new ResizeObserver(calc);
    const id = window.setInterval(() => {
      const b = document.querySelector('button[title="Insert demo rows"]');
      const h = b?.closest("div.border-b") as HTMLElement | null;
      if (h) {
        ro.observe(h);
        window.clearInterval(id);
      }
    }, 100);

    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc);
      ro.disconnect();
      window.clearInterval(id);
    };
  }, [open]);

  // ---- Keyboard shortcuts (sticky: no outside-click / no Escape close) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { onGoto, onPrev, onNext, hitIndex } = handlersRef.current;
      if (e.key === "Enter") onGoto(hitIndex);
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
      // Intentionally ignore "Escape"
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []); // <- constant length; no warning

  const index1 = matches.length
    ? ((hitIndex % matches.length) + matches.length) % matches.length + 1
    : 0;

  const cellCount = matches.length;
  const recordCount = useMemo(
    () => new Set(matches.map((m) => m.rowId)).size,
    [matches]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto w-[360px] overflow-hidden rounded-none border border-neutral-200 bg-white shadow-md"
        style={{ position: "fixed", top, right: "20px" }}
        role="dialog"
        aria-modal="true"
      >
        {/* Row 1: header (compact) */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <input
            autoFocus
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
            className="w-full truncate bg-transparent p-0 text-[14px] font-semibold leading-5 text-neutral-900 outline-none"
            aria-label="Search"
            placeholder="Search"
          />
          <div className="ml-2 flex shrink-0 items-center gap-1.5">
            <div className="text-[11px] text-neutral-600">
              {index1} of {matches.length || 0}
            </div>
            {/* Segmented up/down control with requested grey */}
            <div className="flex overflow-hidden rounded-none border border-neutral-200 bg-[#f2f2f2]">
              <button
                onClick={onPrev}
                className="grid h-6 w-7 place-items-center hover:bg-neutral-100"
                aria-label="Previous"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <button
                onClick={onNext}
                className="grid h-6 w-7 place-items-center hover:bg-neutral-100"
                aria-label="Next"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            <button
              onClick={onClose}
              className="grid h-6 w-6 place-items-center rounded-none hover:bg-neutral-100"
              aria-label="Close"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: banner (compact) */}
        <div className="bg-[#f2f2f2] px-3 py-1.5 text-[11px] text-neutral-700">
          Found <b>no fields</b> and <b>{cellCount}</b> cells (within{" "}
          <b>{recordCount}</b> records)
        </div>
      </div>
    </div>
  );
}
