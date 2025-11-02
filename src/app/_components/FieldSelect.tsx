// src/app/_components/FieldSelect.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Option = { id: string; label: string };

export default function FieldSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: Option[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.id === value);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-w-[180px] items-center justify-between px-3 py-2 text-[13px] ${className ?? ""}`}
        onMouseDown={(e) => e.stopPropagation()} // belt & suspenders
      >
        <span className="truncate">{current?.label ?? "Select a field"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" className="text-neutral-500">
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            data-floating-menu
            className="fixed z-50 max-h-[280px] overflow-auto rounded-md border border-neutral-200 bg-white shadow-xl"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            // prevent the modal’s outside-click from seeing these
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-neutral-50"
              >
                <span className="truncate">{opt.label}</span>
                {opt.id === value && (
                  <svg width="16" height="16" viewBox="0 0 24 24" className="text-blue-600">
                    <polyline points="4 12 9 17 20 6" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
