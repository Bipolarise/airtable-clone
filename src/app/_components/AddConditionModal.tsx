// src/app/_components/AddConditionModal.tsx
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FieldSelect, { type Option as FieldOptionBase } from "~/app/_components/FieldSelect";

/** Field option with type for the operator menu logic */
type FieldOption = FieldOptionBase & { type: "TEXT" | "NUMBER" };

/** Operator unions */
type TextOp = "contains" | "not_contains" | "eq" | "empty" | "not_empty";
type NumberOp = "gt" | "lt" | "eq" | "empty" | "not_empty";
type OperatorId = TextOp | NumberOp;

type AddConditionModalProps = {
  anchorEl: HTMLElement | null;               // anchor near the “Add condition” button
  onClose: () => void;
  /** Visible fields (columns) for the current table (id, label, type) */
  fieldOptions?: FieldOption[];               // defaults to []
};

export default function AddConditionModal({
  anchorEl,
  onClose,
  fieldOptions = [],
}: AddConditionModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  /* ---------- selected field id (safe for empty arrays) ---------- */
  const [fieldId, setFieldId] = useState<string | null>(
    fieldOptions.length > 0 ? fieldOptions[0]!.id : null
  );

  // keep selection valid when options change (e.g., columns fetched later)
  useEffect(() => {
    if (fieldOptions.length === 0) {
      setFieldId(null);
      return;
    }
    if (!fieldId || !fieldOptions.some((o) => o.id === fieldId)) {
      setFieldId(fieldOptions[0]!.id);
    }
  }, [fieldOptions, fieldId]);

  useEffect(() => setMounted(true), []);

  // Position slightly below the anchor; shifted left to resemble Airtable’s layout
  useLayoutEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 12, left: Math.max(8, r.left - 240) });
  }, [anchorEl]);

  // Close on outside/Esc and keep position updated on resize/scroll
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Element | null;
      if (!panelRef.current || !t) return;

      // If click is on the anchor, inside the panel, or inside any floating dropdown menu, ignore.
      if (anchorEl?.contains(t)) return;
      if (panelRef.current.contains(t)) return;
      if (t.closest("[data-floating-menu]")) return;

      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onMove() {
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      setPos({ top: r.bottom + 12, left: Math.max(8, r.left - 240) });
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove, { passive: true });
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [anchorEl, onClose]);

  /* ---------- operator dropdown (depends on field type) ---------- */
  const selectedField = useMemo(
    () => fieldOptions.find((f) => f.id === fieldId) ?? null,
    [fieldOptions, fieldId]
  );

  const operatorOptions = useMemo<{ id: OperatorId; label: string }[]>(() => {
    if ((selectedField?.type ?? "TEXT") === "NUMBER") {
      return [
        { id: "gt", label: "is greater than" },
        { id: "lt", label: "is smaller than" },
        { id: "eq", label: "is exactly" },
        { id: "empty", label: "is empty" },
        { id: "not_empty", label: "is not empty" },
      ];
    }
    // TEXT
    return [
      { id: "contains", label: "contains" },
      { id: "not_contains", label: "does not contain" },
      { id: "eq", label: "is exactly" },
      { id: "empty", label: "is empty" },
      { id: "not_empty", label: "is not empty" },
    ];
  }, [selectedField?.type]);

  const [operator, setOperator] = useState<OperatorId>(operatorOptions[0]?.id ?? "contains");

  // reset operator when menu changes (e.g., TEXT -> NUMBER)
  useEffect(() => {
    setOperator(operatorOptions[0]?.id ?? (selectedField?.type === "NUMBER" ? "gt" : "contains"));
  }, [operatorOptions, selectedField?.type]);

  const needsValue = operator !== "empty" && operator !== "not_empty";
  const [value, setValue] = useState<string>("");

  /* ---------- tiny inline select used for operator ---------- */
  function InlineSelect<T extends string>({
    value,
    options,
    onChange,
    minWidth = 140,
  }: {
    value: T;
    options: { id: T; label: string }[];
    onChange: (id: T) => void;
    minWidth?: number;
  }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [mpos, setMpos] = useState<{ top: number; left: number; width: number }>({
      top: 0,
      left: 0,
      width: minWidth,
    });

    useLayoutEffect(() => {
      if (!open || !btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setMpos({ top: r.bottom + 6, left: r.left, width: r.width });
    }, [open, minWidth]);

    useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (btnRef.current?.contains(t)) return;
        if (!menuRef.current?.contains(t)) setOpen(false);
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
          className="flex min-w-[140px] items-center justify-between px-3 py-2 text-[13px] text-neutral-800 hover:bg-neutral-50"
          style={{ minWidth }}
          title="Choose operator"
        >
          <span className="truncate">{current?.label ?? ""}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0 text-neutral-500">
            <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {open &&
          createPortal(
            <div
              ref={menuRef}
              data-floating-menu
              className="fixed z-50 max-h-[280px] w-[var(--w)] overflow-auto rounded-md border border-neutral-200 bg-white shadow-xl"
              style={{ top: mpos.top, left: mpos.left, ["--w" as any]: `${mpos.width}px` }}
              role="listbox"
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
                  role="option"
                  aria-selected={opt.id === value}
                  title={opt.label}
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

  if (!mounted || !anchorEl) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Add condition"
      className="fixed z-50 w-[720px] rounded-lg border border-neutral-200 bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="px-4 py-3">
        {/* Header text */}
        <div className="mb-3 text-[13px] text-neutral-600">In this view, show records</div>

        {/* Condition row */}
        <div className="grid grid-cols-[72px_1fr] items-center gap-x-3">
          <div className="text-[13px] text-neutral-700">Where</div>

          {/* pill/segment container */}
          <div className="flex w-full items-stretch overflow-hidden rounded-md border border-neutral-300">
            {/* Field select */}
            <FieldSelect
              value={fieldId}
              onChange={setFieldId}
              options={fieldOptions.map(({ id, label }) => ({ id, label }))} // FieldSelect only needs id+label
              className="min-w-[180px]"
            />

            <div className="h-full w-px bg-neutral-200" />

            {/* Operator select (varies by field type) */}
            <InlineSelect<OperatorId>
              value={operator}
              onChange={setOperator}
              options={operatorOptions}
              minWidth={160}
            />

            <div className="h-full w-px bg-neutral-200" />

            {/* Value input (hidden for empty/not_empty) */}
            {needsValue ? (
              <input
                placeholder="Enter a value"
                className="min-w-0 flex-1 px-3 py-2 text-[13px] outline-none focus:bg-neutral-50"
                inputMode={selectedField?.type === "NUMBER" ? "numeric" : "text"}
                type={selectedField?.type === "NUMBER" ? "number" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            ) : (
              <div className="min-w-0 flex-1 px-3 py-2 text-[13px] text-neutral-400">—</div>
            )}

            <div className="h-full w-px bg-neutral-200" />

            {/* Delete icon (just closes modal for now) */}
            <button
              type="button"
              className="px-3 py-2 text-neutral-700 hover:bg-neutral-50"
              title="Delete condition"
              aria-label="Delete"
              onClick={onClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M3 6h18" stroke="currentColor" strokeWidth="2" />
                <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" />
                <rect x="6" y="6" width="12" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            {/* Drag handle (visual only) */}
            <button
              type="button"
              className="px-3 py-2 text-neutral-500 hover:bg-neutral-50"
              title="Reorder"
              aria-label="Reorder"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
