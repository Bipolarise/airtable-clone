"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefCallback,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  onAddText: () => void;
  onAddNumber: () => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
};

type Pos = { top: number; left: number; maxWidth: number; openUp: boolean };

export default function AddColumnMenu({
  onAddText,
  onAddNumber,
  onClose,
  anchorEl,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Pos | null>(null);

  /* Close on outside click / Esc */
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const p = panelRef.current;
      if (!p) return;
      if (!p.contains(e.target as Node)) onClose();
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [onClose]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  /* Positioning */
  const computePosition = () => {
    const anchor = anchorEl;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const ar = anchor.getBoundingClientRect();

    // measure off-screen
    const prev = {
      visibility: panel.style.visibility,
      top: panel.style.top,
      left: panel.style.left,
      position: panel.style.position,
    };
    panel.style.visibility = "hidden";
    panel.style.top = "-9999px";
    panel.style.left = "-9999px";
    panel.style.position = "fixed";

    const pr = panel.getBoundingClientRect();
    const panelW = pr.width || 288; // was 320 → 288
    const panelH = pr.height || 232; // a bit shorter default

    // restore
    panel.style.visibility = prev.visibility;
    panel.style.top = prev.top;
    panel.style.left = prev.left;
    panel.style.position = prev.position;

    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let openUp = false;
    let top = ar.bottom + gap;
    if (top + panelH > vh - 8) {
      openUp = true;
      top = Math.max(8, ar.top - gap - panelH);
    }
    const left = Math.min(Math.max(8, ar.left), vw - panelW - 8);

    setPos({
      top,
      left,
      maxWidth: Math.min(288, vw - 16),
      openUp,
    });
  };

  useLayoutEffect(() => {
    computePosition();
    const onReflow = () => computePosition();
    window.addEventListener("resize", onReflow, { passive: true });
    window.addEventListener("scroll", onReflow, { passive: true });
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  /* Options */
  const options = useMemo(
    () => [
      { id: "singleLine", label: "Single line text", onPick: onAddText, Icon: SingleLineIcon },
      { id: "number", label: "Number", onPick: onAddNumber, Icon: NumberIcon },
    ],
    [onAddNumber, onAddText]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  /* Keyboard nav */
  const onMenuKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = itemRefs.current.filter(
      (el): el is HTMLButtonElement => el !== null
    );
    if (!items.length) return;
    e.preventDefault();
    const activeEl = document.activeElement as HTMLElement | null;
    let idx = Math.max(0, items.findIndex((el) => el === activeEl));
    const n = items.length;
    const focusAt = (i: number) => items[(i + n) % n]!.focus();
    if (activeEl === searchRef.current) {
      focusAt(0);
      return;
    }
    if (e.key === "ArrowDown") focusAt(idx + 1);
    else focusAt(idx - 1);
  };

  const setItemRef = (i: number): RefCallback<HTMLButtonElement> => {
    return (el: HTMLButtonElement | null): void => {
      itemRefs.current[i] = el;
    };
  };

  /* ——— Compact styles ——— */
  const sectionTitleCls =
    "px-2.5 pt-2 pb-1 text-[11.5px] font-semibold text-neutral-700 select-none";
  const itemBaseCls = [
    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-neutral-900",
    "hover:bg-neutral-50",
    "cursor-pointer", // 👈 hand cursor for the options
    "outline-none ring-0 [box-shadow:none]",
    "focus:outline-none focus:ring-0 focus:[box-shadow:none]",
    "focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:none]",
    "focus-visible:bg-neutral-50",
  ].join(" ");

  /* Panel (always rendered; positioned off-screen until ready) */
  const panel = (
    <div
      ref={panelRef}
      role="menu"
      onKeyDown={onMenuKeyDown}
      onWheelCapture={(e) => e.stopPropagation()}
      className={[
        "fixed z-[1000]",
        "rounded-lg border border-neutral-200 bg-white p-2", // smaller radius & padding
        "shadow-[0_12px_36px_rgba(0,0,0,0.12)]",
        "max-h-[56vh] overflow-y-auto overscroll-contain",
        "outline-none ring-0 [box-shadow:none]",
        "focus:outline-none focus:ring-0 focus:[box-shadow:none]",
      ].join(" ")}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: 288, // 18rem
        maxWidth: pos?.maxWidth ?? 288,
        transformOrigin: pos?.openUp ? "bottom left" : "top left",
      }}
    >
      {/* Search */}
      <div className="relative px-2 pb-1">
        <div className="pointer-events-none absolute left-3.5 top-1.5">
          <SearchIcon />
        </div>
        <input
          ref={searchRef}
          type="text"
          placeholder="Find a field type"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={[
            "h-7 w-full rounded-md bg-neutral-100/50 pl-7 pr-3", // smaller height & left padding
            "text-[12.5px] text-neutral-800 placeholder:text-neutral-400",
            "outline-none ring-0 [box-shadow:none]",
            "focus:outline-none focus:ring-0 focus:[box-shadow:none]",
            "focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:none]",
            "focus:bg-neutral-100",
          ].join(" ")}
        />
      </div>

      <div className={sectionTitleCls}>Standard fields</div>

      <div className="flex flex-col gap-0.5 px-2 pb-1">
        {filtered.map(({ id, label, Icon, onPick }, i) => (
          <button
            key={id}
            ref={setItemRef(i)}
            role="menuitem"
            className={itemBaseCls}
            onClick={() => {
              onPick();
              onClose();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
                onClose();
              }
            }}
          >
            <Icon small />
            <span>{label}</span>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="px-3 py-4 text-[12px] text-neutral-500">
            No field types match “{query}”.
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

/* ---------------- Icons ---------------- */

function SingleLineIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "h-4 w-4 shrink-0 text-neutral-700" : "h-5 w-5 shrink-0 text-neutral-700"}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.44187 3.26606C8.35522 3.10237 8.18518 3 7.99998 3C7.81477 3 7.64474 3.10237 7.55808 3.26606L3.05808 11.7661C2.92888 12.0101 3.02198 12.3127 3.26603 12.4419C3.51009 12.5711 3.81267 12.478 3.94187 12.2339L5.12455 10H10.8754L12.0581 12.2339C12.1873 12.478 12.4899 12.5711 12.7339 12.4419C12.978 12.3127 13.0711 12.0101 12.9419 11.7661L8.44187 3.26606ZM10.346 9L7.99998 4.56863L5.65396 9H10.346Z"
      />
    </svg>
  );
}

function NumberIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "h-4 w-4 shrink-0 text-neutral-700" : "h-5 w-5 shrink-0 text-neutral-700"}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="nonzero"
        d="M6 2C5.86739 2 5.74021 2.05268 5.64645 2.14645C5.55268 2.24021 5.5 2.36739 5.5 2.5V5.5H2.5C2.36739 5.5 2.24021 5.55268 2.14645 5.64645C2.05268 5.74021 2 5.86739 2 6C2 6.13261 2.05268 6.25979 2.14645 6.35355C2.24021 6.44732 2.36739 6.5 2.5 6.5H5.5V9.5H2.5C2.36739 9.5 2.24021 9.55268 2.14645 9.64645C2.05268 9.74021 2 9.86739 2 10C2 10.1326 2.05268 10.2598 2.14645 10.3536C2.24021 10.4473 2.36739 10.5 2.5 10.5H5.5V13.5C5.5 13.6326 5.55268 13.7598 5.64645 13.8536C5.74021 13.9473 5.86739 14 6 14C6.13261 14 6.25979 13.9473 6.35355 13.8536C6.44732 13.7598 6.5 13.6326 6.5 13.5V10.5H9.5V13.5C9.5 13.6326 9.55268 13.7598 9.64645 13.8536C9.74021 13.9473 9.86739 14 10 14C10.1326 14 10.2598 13.9473 10.3536 13.8536C10.4473 13.7598 10.5 13.6326 10.5 13.5V10.5H13.5C13.6326 10.5 13.7598 10.4473 13.8536 10.3536C13.9473 10.2598 14 10.1326 14 10C14 9.86739 13.9473 9.74021 13.8536 9.64645C13.7598 9.55268 13.6326 9.5 13.5 9.5H10.5V6.5H13.5C13.6326 6.5 13.7598 6.44732 13.8536 6.35355C13.9473 6.25979 14 6.13261 14 6C14 5.86739 13.9473 5.74021 13.8536 5.64645C13.7598 5.55268 13.6326 5.5 13.5 5.5H10.5V2.5C10.5 2.36739 10.4473 2.24021 10.3536 2.14645C10.2598 2.05268 10.1326 2 10 2C9.86739 2 9.74021 2.05268 9.64645 2.14645C9.55268 2.24021 9.5 2.36739 9.5 2.5V5.5H6.5V2.5C6.5 2.36739 6.44732 2.24021 6.35355 2.14645C6.25979 2.05268 6.13261 2 6 2ZM6.5 6.5H9.5V9.5H6.5V6.5Z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-neutral-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
