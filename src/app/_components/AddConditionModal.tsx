"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FieldSelect from "~/app/_components/FieldSelect";
import { IconQuestion } from "~/app/_icons/IconQuestion";
import type { Condition, OperatorId, FieldOptionForModal } from "./ViewHeaderBar";

/* Props now fully controlled */
type AddConditionModalProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  fieldOptions: FieldOptionForModal[];
  conditions: Condition[];
  onChangeConditions: (next: Condition[]) => void;
};

export default function AddConditionModal({
  anchorEl,
  onClose,
  fieldOptions,
  conditions,
  onChangeConditions,
}: AddConditionModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  // Position near the Filter button
  useEffect(() => {
    if (!anchorEl) return;

    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      const panelW = panelRef.current?.offsetWidth ?? 560; // fallback to w-[560px]
      const left = Math.max(8, r.right - panelW);         // align right edges
      setPos({ top: r.bottom + 12, left });
    };

    update(); // run once immediately
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [anchorEl]);

  // Outside click / ESC to close (keep open for dropdown portals)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!panelRef.current) return;
      const t = e.target as Node;
      if (panelRef.current.contains(t)) return;
      if ((t as HTMLElement).closest("[data-modal-stay-open='true']")) return;
      if (anchorEl?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorEl, onClose]);

  const findField = (id: string | null) =>
    fieldOptions.find((f) => f.id === id) ?? null;

  const defaultFieldId = fieldOptions[0]?.id ?? null;
  const defaultOp = (fId: string | null): OperatorId =>
    (findField(fId)?.type ?? "TEXT") === "NUMBER" ? "gt" : "contains";

  const onAddConditionAppend = () => {
    const seedFieldId = defaultFieldId;
    const next: Condition = {
      id: rid(),
      join: "and",
      fieldId: seedFieldId,
      op: defaultOp(seedFieldId),
      value: "",
    };
    onChangeConditions([...(conditions ?? []), next]);
  };

  const onDelete = (id: string) => onChangeConditions((conditions ?? []).filter((c) => c.id !== id));
  const onChangeJoin = (id: string, join: "and" | "or") =>
    onChangeConditions((conditions ?? []).map((c) => (c.id === id ? { ...c, join } : c)));
  const onChangeField = (id: string, fieldId: string | null) =>
    onChangeConditions(
      (conditions ?? []).map((c) => (c.id === id ? { ...c, fieldId, op: defaultOp(fieldId) } : c))
    );
  const onChangeOp = (id: string, op: OperatorId) =>
    onChangeConditions((conditions ?? []).map((c) => (c.id === id ? { ...c, op } : c)));
  const onChangeValue = (id: string, value: string) =>
    onChangeConditions((conditions ?? []).map((c) => (c.id === id ? { ...c, value } : c)));

  if (!mounted || !anchorEl) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Filter records"
      className="fixed z-50 w-[560px] rounded-lg border border-neutral-200 bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="px-4 py-3">
        <div className="mb-2 text-[13px] text-neutral-600">In this view, show records</div>

        <div className="flex flex-col gap-2">
          {(conditions ?? []).map((cond, idx) => (
            <ConditionRow
              key={cond.id}
              first={idx === 0}
              condition={cond}
              fieldOptions={fieldOptions}
              onChangeJoin={onChangeJoin}
              onChangeField={onChangeField}
              onChangeOp={onChangeOp}
              onChangeValue={onChangeValue}
              onDelete={onDelete}
            />
          ))}

          <div className="mt-1 flex items-center gap-4 text-[13px]">
            {/* Add condition — hover -> blue text */}
            <button
              type="button"
              onClick={onAddConditionAppend}
              className="rounded px-1.5 py-1 text-neutral-600 transition-colors hover:text-blue-600 focus:text-blue-600 active:text-blue-700"
            >
              <span className="mr-1">+</span>
              Add condition
            </button>

            {/* Add condition group — disabled */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Coming soon"
              className="rounded px-1.5 py-1 cursor-not-allowed select-none text-neutral-400"
            >
              <span className="mr-1">+</span>
              Add condition group
            </button>

            {/* Help icon */}
            <button
              type="button"
              className="ml-1 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              title="Help"
              aria-label="Help"
            >
              <IconQuestion className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- rows & compact segmented control ---------- */
function ConditionRow({
  first,
  condition,
  fieldOptions,
  onChangeJoin,
  onChangeField,
  onChangeOp,
  onChangeValue,
  onDelete,
}: {
  first: boolean;
  condition: Condition;
  fieldOptions: FieldOptionForModal[];
  onChangeJoin: (id: string, join: "and" | "or") => void;
  onChangeField: (id: string, fieldId: string | null) => void;
  onChangeOp: (id: string, op: OperatorId) => void;
  onChangeValue: (id: string, v: string) => void;
  onDelete: (id: string) => void;
}) {
  const field = useMemo(
    () => fieldOptions.find((f) => f.id === condition.fieldId) ?? null,
    [condition.fieldId, fieldOptions]
  );

  const ops: { id: OperatorId; label: string }[] =
    (field?.type ?? "TEXT") === "NUMBER"
      ? [
          { id: "gt", label: "is greater than" },
          { id: "lt", label: "is smaller than" },
          { id: "eq", label: "is exactly" },
          { id: "empty", label: "is empty" },
          { id: "not_empty", label: "is not empty" },
        ]
      : [
          { id: "contains", label: "contains" },
          { id: "not_contains", label: "does not contain" },
          { id: "eq", label: "is exactly" },
          { id: "empty", label: "is empty" },
          { id: "not_empty", label: "is not empty" },
        ];

  const needsValue = condition.op !== "empty" && condition.op !== "not_empty";

  return (
    <div className="grid grid-cols-[68px_1fr_auto] items-center gap-x-3">
      {/* LEFT: 'Where' or the AND/OR switcher */}
      <div className="text-[13px] text-neutral-700">
        {first ? (
          <span className="inline-block select-none text-neutral-600">Where</span>
        ) : (
          <InlineChoice
            value={condition.join ?? "and"}
            options={[
              { id: "and", label: "and" },
              { id: "or", label: "or" },
            ]}
            onChange={(j) => onChangeJoin(condition.id, j)}
            minWidth={56}
          />
        )}
      </div>

      {/* MIDDLE: compact segmented control */}
      <div className="flex w-full items-stretch overflow-hidden rounded-md border border-neutral-300">
        {/* Field (Name) — FIXED, non-growing */}
        <div className="basis-[108px] shrink-0 grow-0">
          <FieldSelect
            value={condition.fieldId}
            onChange={(v) => onChangeField(condition.id, v)}
            options={fieldOptions.map(({ id, label }) => ({ id, label }))}
            className="w-full px-3 py-2 hover:bg-neutral-50"
          />
        </div>

        <div className="h-full w-px bg-neutral-200" />

        {/* Operator — small, non-growing */}
        <InlineChoice<OperatorId>
          value={condition.op}
          options={ops}
          onChange={(op) => onChangeOp(condition.id, op)}
          minWidth={112}
        />

        <div className="h-full w-px bg-neutral-200" />

        {/* Value — compact */}
        {needsValue ? (
          <input
            placeholder="Enter a value"
            className="w-[160px] shrink-0 truncate px-3 py-2 text-[13px] outline-none focus:bg-neutral-50"
            inputMode={field?.type === "NUMBER" ? "numeric" : "text"}
            type={field?.type === "NUMBER" ? "number" : "text"}
            value={condition.value}
            onChange={(e) => onChangeValue(condition.id, e.target.value)}
          />
        ) : (
          <div className="w-[160px] shrink-0 px-3 py-2 text-[13px] text-neutral-400">—</div>
        )}
      </div>

      {/* RIGHT: delete */}
      <div className="flex items-center">
        <button
          type="button"
          className="rounded p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
          title="Delete condition"
          aria-label="Delete condition"
          onClick={() => onDelete(condition.id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M3 6h18" stroke="currentColor" strokeWidth="2" />
            <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" />
            <rect x="6" y="6" width="12" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function InlineChoice<T extends string>({
  value,
  options,
  onChange,
  minWidth = 112,
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
        className="flex items-center justify-between px-3 py-2 text-[13px] text-neutral-800 hover:bg-neutral-50"
        style={{ minWidth }}
        title="Choose"
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
            data-modal-stay-open="true"
            className="fixed z-50 max-h-[260px] w-[var(--w)] overflow-auto rounded-md border border-neutral-200 bg-white shadow-xl"
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

function rid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 9)}`;
}
