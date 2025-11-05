"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
  // icons
import { IconDotsSixVertical } from "~/app/_icons/IconDotsSixVertical";
import { IconQuestion } from "~/app/_icons/IconQuestion";
import { IconX } from "~/app/_icons/IconX";

/* ---------------- Tunables ---------------- */
const MODAL_WIDTH = 320;
const LIST_MAX_HEIGHT = 280;
const FONT_SM = "text-[12px]";
const PAD_X = "px-3";
const PAD_Y = "py-1.5";

/** Labels to exclude from the modal entirely. */
const EXCLUDED_LABELS = new Set(["name"]);

export type HideFieldsModalField = {
  id: string;
  label: string;
  type: "TEXT" | "NUMBER" | "ATTACHMENT" | "PERSON" | "STATUS" | "OTHER";
  hidden: boolean;
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

  // Filter out excluded labels first; then apply search.
  const filtered = useMemo(() => {
    const base = fields.filter(
      (f) => !EXCLUDED_LABELS.has(f.label.toLowerCase())
    );
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((f) => f.label.toLowerCase().includes(q));
  }, [fields, query]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Hide fields"
      className="fixed z-50 rounded-lg border border-neutral-300 bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left, width: MODAL_WIDTH }}
    >
      {/* Header with searchable input */}
      <div className="pt-3 px-4">
        <div className="flex items-center gap-2">
          {/* search input + clear */}
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a field"
              className="
                w-full bg-transparent
                border-0 border-b border-neutral-200
                pb-1 pt-1 pl-1.5 pr-6
                text-[13px] font-medium text-neutral-600
                outline-none
                focus:border-neutral-400
                placeholder:text-neutral-500
              "
              aria-label="Find a field"
              autoFocus
            />
            {query !== "" && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center text-neutral-500 hover:text-neutral-700"
              >
                <IconX className="h-[14px] w-[14px]" />
              </button>
            )}
          </div>

          {/* help icon */}
          <button
            type="button"
            aria-label="Help"
            className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600"
          >
            <IconQuestion className="h-[14px] w-[14px]" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-auto" style={{ maxHeight: LIST_MAX_HEIGHT }}>
        <div className="px-2 pb-1">
          {filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onToggle(f.id)}
              className={`group flex w-full items-center gap-2 rounded ${PAD_X} ${PAD_Y} ${FONT_SM} text-left hover:bg-neutral-50`}
              title={f.hidden ? "Show field" : "Hide field"}
            >
              {/* tiny pill */}
              <AirtableMiniPill on={!f.hidden} />

              {/* icon + label */}
              <span className="shrink-0">
                {f.icon ?? <FieldIcon type={f.type} small />}
              </span>
              <span className="flex-1 truncate text-neutral-900">{f.label}</span>

              {/* drag dots */}
              <IconDotsSixVertical
                className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-600"
                aria-hidden="true"
              />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={`px-2 py-4 text-center ${FONT_SM} text-neutral-500`}>
              No fields match “{query}”.
            </div>
          )}
        </div>
      </div>

      {/* Footer — longer buttons */}
      <div className="flex items-center gap-3 border-t border-neutral-200 px-3 py-3">
        <button
          type="button"
          onClick={onHideAll}
          className={`flex-1 h-7 rounded-sm bg-neutral-100 px-4 ${FONT_SM} text-neutral-800 hover:bg-neutral-200/70 active:bg-neutral-200`}
        >
          Hide all
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className={`flex-1 h-7 rounded-sm bg-neutral-100 px-4 ${FONT_SM} text-neutral-800 hover:bg-neutral-200/70 active:bg-neutral-200`}
        >
          Show all
        </button>
      </div>
    </div>,
    document.body
  );
}

/* Fallback icon (with small option) */
function FieldIcon({
  type,
  small = false,
}: {
  type: HideFieldsModalField["type"];
  small?: boolean;
}) {
  const cls = small ? "h-3.5 w-3.5 text-neutral-700" : "h-4 w-4 text-neutral-700";
  switch (type) {
    case "NUMBER":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2h2v12H4V2zm6 0h2v12h-2V2z" />
        </svg>
      );
    case "ATTACHMENT":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M7 3a3 3 0 00-3 3v5a4 4 0 108 0V6h-2v5a2 2 0 11-4 0V6a1 1 0 112 0v6h2V6a3 3 0 00-3-3z" />
        </svg>
      );
    case "PERSON":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 9a4 4 0 00-4 4h2a2 2 0 114 0h2a4 4 0 00-4-4zM8 2a3 3 0 110 6 3 3 0 010-6z" />
        </svg>
      );
    case "STATUS":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 11H7V7h2v5zm0-6H7V4h2v2z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4h12v2H2V4zm0 4h12v2H2V8zm0 4h12v2H2v-2z" />
        </svg>
      );
  }
}

/* Airtable micro pill */
function AirtableMiniPill({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "pill flex flex-none items-center rounded-full border-box " +
        (on ? "justify-end" : "justify-start")
      }
      style={{
        height: 8,
        width: 12.8,
        padding: 2,
        borderRadius: 9999,
        backgroundColor: on ? "var(--palette-green-green, #2f7d1f)" : "#ffffff",
        border: on ? "none" : "1px solid rgb(212,212,212)",
      }}
    >
      <span
        className="white circle flex-none"
        style={{
          width: 4,
          height: 4,
          borderRadius: 9999,
          background: "#fff",
        }}
      />
    </span>
  );
}
