"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type HideFieldsModalField = {
  id: string;
  label: string;
  /** Keep type for fallback icon, but we’ll prefer the provided `icon`. */
  type: "TEXT" | "NUMBER" | "ATTACHMENT" | "PERSON" | "STATUS" | "OTHER";
  hidden: boolean;
  /** NEW: pass the exact icon node you want to render */
  icon?: ReactNode;
};

type HideFieldsModalProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;

  fields: HideFieldsModalField[];
  onToggle(id: string): void;
  onHideAll(): void;
  onShowAll(): void;
};

export default function HideFieldsModal({
  anchorEl,
  onClose,
  fields,
  onToggle,
  onHideAll,
  onShowAll,
}: HideFieldsModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [query, setQuery] = useState("");

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(8, r.left) });
  }, [anchorEl]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!panelRef.current) return;
      const t = e.target as Node;
      if (anchorEl?.contains(t)) return;
      if (!panelRef.current.contains(t)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onReflow() {
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.max(8, r.left) });
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow, { passive: true });
    window.addEventListener("scroll", onReflow, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow);
    };
  }, [anchorEl, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((f) => f.label.toLowerCase().includes(q));
  }, [fields, query]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Hide fields"
      className="fixed z-50 w-[420px] rounded-lg border border-neutral-200 bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Header / search */}
      <div className="px-4 pt-3 pb-2">
        <div className="mb-2 text-[13px] font-medium text-neutral-700">Find a field</div>
        <div className="flex items-center rounded-md border border-neutral-300 px-2 py-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-500">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fields…"
            className="ml-2 w-full text-[13px] outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-auto px-2 pb-2">
        {filtered.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onToggle(f.id)}
            className="flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-neutral-50"
            title={f.hidden ? "Show field" : "Hide field"}
          >
            {/* visibility pill (green means visible) */}
            <span
              aria-hidden
              className={
                "inline-flex h-4 w-6 items-center justify-center rounded-full border " +
                (f.hidden
                  ? "border-neutral-300 bg-white"
                  : "border-green-700/20 bg-green-600")
              }
            >
              {!f.hidden && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>

            {/* exact icon (falls back to generic) */}
            <span className="shrink-0">
              {f.icon ?? <FieldIcon type={f.type} />}
            </span>

            <span className="flex-1 truncate text-[13px] text-neutral-800">{f.label}</span>

            {/* drag dots placeholder */}
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-300" aria-hidden>
              <circle cx="7" cy="9" r="1.4" />
              <circle cx="7" cy="15" r="1.4" />
              <circle cx="12" cy="9" r="1.4" />
              <circle cx="12" cy="15" r="1.4" />
              <circle cx="17" cy="9" r="1.4" />
              <circle cx="17" cy="15" r="1.4" />
            </svg>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-6 text-center text-[13px] text-neutral-500">
            No fields match “{query}”.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
        <button
          type="button"
          onClick={onHideAll}
          className="rounded bg-neutral-100 px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-200"
        >
          Hide all
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className="rounded bg-neutral-100 px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-200"
        >
          Show all
        </button>
      </div>
    </div>,
    document.body
  );
}

/* Fallback icon if no exact icon is passed */
function FieldIcon({ type }: { type: HideFieldsModalField["type"] }) {
  const common = "h-4 w-4 text-neutral-700";
  switch (type) {
    case "NUMBER":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2h2v12H4V2zm6 0h2v12h-2V2z" />
        </svg>
      );
    case "ATTACHMENT":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor">
          <path d="M7 3a3 3 0 00-3 3v5a4 4 0 108 0V6h-2v5a2 2 0 11-4 0V6a1 1 0 112 0v6h2V6a3 3 0 00-3-3z" />
        </svg>
      );
    case "PERSON":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 9a4 4 0 00-4 4h2a2 2 0 114 0h2a4 4 0 00-4-4zM8 2a3 3 0 110 6 3 3 0 010-6z" />
        </svg>
      );
    case "STATUS":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 11H7V7h2v5zm0-6H7V4h2v2z" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4h12v2H2V4zm0 4h12v2H2V8zm0 4h12v2H2v-2z" />
        </svg>
      );
  }
}
