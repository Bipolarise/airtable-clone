"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconGridFeature } from "~/app/_icons/IconGridFeature";

export type ViewItem = { id: string; name: string; type: "grid" };

type ViewsPanelProps = {
  open: boolean;
  headerHeight?: number;    // height of the toolbar (defaults 48)
  topOffset?: number;       // extra offset to reach the grid top (defaults 72)
  width?: number;           // panel width (defaults 260)
  views: ViewItem[];
  activeViewId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
  leftOffset?: number;      // align with where the table starts
  bottomOffset?: number;    // gap from bottom (grid footer height). default 40
  onHoverIn?: () => void;
  onHoverOut?: () => void;
};

export default function ViewsPanel({
  open,
  headerHeight = 48,
  topOffset = 142,
  width = 260,
  views,
  activeViewId,
  onSelect,
  onCreate,
  onClose,
  leftOffset = 0,
  bottomOffset = 0,
  onHoverIn,
  onHoverOut,
}: ViewsPanelProps) {
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return views;
    return views.filter((v) => v.name.toLowerCase().includes(q));
  }, [views, query]);

  if (!open) return null;

  const top = headerHeight + topOffset;

  return (
    <>
      <div
        className="absolute z-40 bg-black/20 md:hidden"
        style={{ top, left: 0, right: 0, bottom: bottomOffset }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Views"
        className="absolute z-50 w-[var(--w)] translate-x-0 border-r border-neutral-200 bg-white transition-transform duration-150 ease-out"
        style={
          {
            top,
            bottom: bottomOffset,
            left: leftOffset,
            ["--w" as any]: `${width}px`,
          } as React.CSSProperties
        }
        onMouseEnter={onHoverIn}
        onMouseLeave={onHoverOut}
      >
        <div className="flex h-full flex-col">
          <div className="px-3 py-2 text-[13px] font-medium text-neutral-700">Views</div>

          <div className="px-2">
            <button
              type="button"
              onClick={onCreate}
              className="mb-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300">+</span>
              <span>Create new…</span>
            </button>

            <div className="mb-2 flex items-center rounded-md border border-neutral-300 px-2 py-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-500">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a view"
                className="ml-2 w-full text-[13px] outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-1">
            {filtered.map((v) => {
              const active = v.id === activeViewId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className={
                    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] " +
                    (active ? "bg-neutral-100" : "hover:bg-neutral-50")
                  }
                >
                  <IconGridFeature className="h-4 w-4 text-[#166ee1]" />
                  <span className="truncate">{v.name}</span>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" className="ml-auto text-blue-600">
                      <polyline points="4 12 9 17 20 6" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pointer-events-none relative">
            <button
              type="button"
              onClick={onCreate}
              className="pointer-events-auto absolute bottom-4 left-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-200"
              title="New view"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
