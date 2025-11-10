"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { IconQuestion } from "~/app/_icons/IconQuestion";
import { IconDotsSixVertical } from "~/app/_icons/IconDotsSixVertical";
import { IconMiniPill } from "~/app/_icons/IconMiniPill";

/* (for list icons – keep as-is if you want the icons) */
import { IconFieldName } from "~/app/_icons/IconFieldName";
import { IconFieldNotes } from "~/app/_icons/IconFieldNotes";
import { IconFieldAssignee } from "~/app/_icons/IconFieldAssignee";
import { IconFieldStatus } from "~/app/_icons/IconFieldStatus";
import { IconFieldAttachment } from "~/app/_icons/IconFieldAttachment";
import { IconFieldNumber } from "~/app/_icons/IconFieldNumber";
import { IconTinyDot } from "~/app/_icons/IconTinyDot";

export type SortDir = "asc" | "desc";
export type SortRule = { fieldId: string; dir: SortDir };
export type SortField = { id: string; label: string; type: "TEXT" | "NUMBER" };

type Props = {
  anchorEl: HTMLButtonElement | null;
  fieldId?: string;
  fields: SortField[];
  rules: SortRule[];
  onChangeRules: (next: SortRule[]) => void;
  onClose: () => void;
  onEmpty: () => void;
};

const WIDTH = 420;
const PICKER_MAX_H = 260;

export default function SortEditorModal({
  anchorEl,
  fieldId,
  fields,
  rules,
  onChangeRules,
  onClose,
  onEmpty,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [autoSort, setAutoSort] = useState(true);
  useEffect(() => setMounted(true), []);

  const rect = useMemo(() => anchorEl?.getBoundingClientRect() ?? null, [anchorEl]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on ESC / click-away (but ignore clicks inside child popovers)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClickAway = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!panelRef.current) return;

      const clickedInsideMain = panelRef.current.contains(t!);
      const clickedAnchor = !!anchorEl?.contains(t!);
      const clickedInChildPopover = Array.from(
        document.querySelectorAll<HTMLElement>('[data-sort-popover="true"]')
      ).some((el) => el.contains(t as Node));

      if (!clickedInsideMain && !clickedAnchor && !clickedInChildPopover) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickAway);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickAway);
    };
  }, [onClose, anchorEl]);

  // Ensure a rule exists when opened from a header
  useEffect(() => {
    if (!fieldId) return;
    if (!rules.some((r) => r.fieldId === fieldId)) {
      onChangeRules([...rules, { fieldId, dir: "asc" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  // Drag & drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (!mounted || !rect) return null;

  /* ---------------- rule helpers ---------------- */
  const updateRule = (index: number, patch: Partial<SortRule>) => {
    const current = rules[index];
    if (!current) return;
    const merged: SortRule = {
      fieldId: patch.fieldId ?? current.fieldId,
      dir: patch.dir ?? current.dir,
    };
    const next = rules.slice();
    next[index] = merged;
    onChangeRules(next);
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) {
      onChangeRules([]);
      onClose();
      onEmpty();
      return;
    }
    const next = rules.slice();
    next.splice(index, 1);
    onChangeRules(next);
  };

  const addRule = () => {
    const first = fields[0];
    if (first) onChangeRules([...rules, { fieldId: first.id, dir: "asc" }]);
  };

  /* ---------------- drag & drop (handle-only) ---------------- */
  const startDrag = (i: number, e: React.DragEvent) => {
    setDragIdx(i);
    setOverIdx(i);
    e.dataTransfer.setData("text/plain", String(i));
    e.dataTransfer.effectAllowed = "move";
  };

  const enterRow = (i: number) => {
    if (dragIdx === null) return;
    if (i !== overIdx) setOverIdx(i);
  };

  const endDrag = () => {
    if (dragIdx == null || overIdx == null || dragIdx === overIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = rules.slice();
    const from = Math.max(0, Math.min(dragIdx, next.length - 1));
    const to = Math.max(0, Math.min(overIdx, next.length - 1));
    const [moved] = next.splice(from, 1);
    if (!moved) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    next.splice(to, 0, moved);
    onChangeRules(next);
    setDragIdx(null);
    setOverIdx(null);
  };

  const iconFor = (f: SortField) => {
    const cls = "h-4 w-4 text-neutral-700";
    switch (f.label) {
      case "Name":
        return <IconFieldName className={cls} />;
      case "Notes":
      case "Notes 2":
      case "Notes 3":
        return <IconFieldNotes className={cls} />;
      case "Assignee":
        return <IconFieldAssignee className={cls} />;
      case "Status":
        return <IconFieldStatus className={cls} />;
      case "Attachments":
      case "Attachment...":
      case "Attachment Summary":
        return <IconFieldAttachment className={cls} />;
      case "Number":
        return <IconFieldNumber className={cls} />;
      default:
        if (f.type === "TEXT") return <IconFieldName className={cls} />;
        if (f.type === "NUMBER") return <IconFieldNumber className={cls} />;
        return <IconTinyDot className="h-1 w-1 text-neutral-500" />;
    }
  };

  // --- POSITION: align right edge of modal to right edge of Sort button ---
  const left = Math.max(
    10,
    Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 10)
  );

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-50 select-none rounded-md border border-neutral-200 bg-white shadow-xl"
      style={{
        top: rect.bottom + 6,
        left,
        width: WIDTH,
      }}
      role="dialog"
      aria-label="Sort by"
    >
      {/* Header (X removed) */}
      <div className="flex items-center px-2.5 pt-2 pb-1">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-medium text-neutral-700">Sort by</span>
          <IconQuestion className="h-[12px] w-[12px] text-neutral-400" />
        </div>
      </div>
      <div className="mx-2.5 h-px bg-neutral-200" />

      {/* Rules (draggable) */}
      <div className="px-2.5 py-1 space-y-[2px]">
        {rules.map((rule, i) => (
          <div
            key={`${rule.fieldId}-${i}`}
            className={[
              "rounded-[6px] transition-all",
              dragIdx !== null && i === overIdx
                ? "outline outline-2 outline-neutral-300"
                : "outline-none",
              dragIdx === i ? "bg-neutral-50 shadow-sm" : "",
            ].join(" ")}
            onDragEnter={() => enterRow(i)}
            onDragOver={(e) => e.preventDefault()}
          >
            <RuleRow
              index={i}
              rule={rule}
              fields={fields}
              iconFor={iconFor}
              onChange={updateRule}
              onRemove={removeRule}
              onDragStart={startDrag}
              onDragEnd={endDrag}
            />
          </div>
        ))}

        {/* Add another sort */}
        <button
          className="mt-0.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-neutral-700 hover:bg-neutral-100"
          onClick={addRule}
        >
          <span className="text-[14px] leading-none">＋</span>
          <span>Add another sort</span>
        </button>
      </div>

      {/* Footer – pill switch */}
      <div className="rounded-b-md bg-neutral-50 px-2.5 py-1.5">
        <button
          type="button"
          role="switch"
          aria-checked={autoSort}
          onClick={() => setAutoSort((s) => !s)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setAutoSort((s) => !s);
            }
          }}
          className="inline-flex items-center gap-2 text-[12px] text-neutral-800 hover:text-neutral-900 focus:outline-none"
        >
          <IconMiniPill on={autoSort} />
          <span>Automatically sort records</span>
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Row with working dropdowns + drag handle ---------- */

function RuleRow({
  index,
  rule,
  fields,
  iconFor,
  onChange,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  index: number;
  rule: SortRule;
  fields: SortField[];
  iconFor: (f: SortField) => JSX.Element;
  onChange: (index: number, patch: Partial<SortRule>) => void;
  onRemove: (index: number) => void;
  onDragStart: (i: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const fieldBtnRef = useRef<HTMLButtonElement | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);

  const dirBtnRef = useRef<HTMLButtonElement | null>(null);
  const [dirOpen, setDirOpen] = useState(false);

  const currentField = fields.find((f) => f.id === rule.fieldId) ?? fields[0];
  const isNumeric = currentField?.type === "NUMBER";
  const dirLabel =
    rule.dir === "asc" ? (isNumeric ? "1 → 9" : "A → Z") : (isNumeric ? "9 → 1" : "Z → A");

  return (
    <div className="flex items-center gap-2">
      {/* Field trigger */}
      <button
        ref={fieldBtnRef}
        onClick={() => setFieldOpen((o) => !o)}
        className="group flex min-w-0 flex-1 items-center justify-between rounded-[8px] border border-neutral-300 px-2 py-1 text-left text-[11px] text-neutral-800 hover:bg-neutral-100"
      >
        <span className="min-w-0 truncate">{currentField?.label}</span>
        <Chevron className="ml-2 shrink-0 text-neutral-500" />
      </button>

      {/* Direction trigger */}
      <button
        ref={dirBtnRef}
        onClick={() => setDirOpen((o) => !o)}
        className="w-32 flex items-center justify-between rounded-[8px] border border-neutral-300 px-2 py-1 text-[11px] text-neutral-800 hover:bg-neutral-100"
        aria-haspopup="listbox"
        aria-expanded={!!dirOpen}
        title="Sort direction"
      >
        <span>{dirLabel}</span>
        <Chevron className="ml-2 shrink-0 text-neutral-500" />
      </button>

      {/* Remove */}
      <button
        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        onClick={() => onRemove(index)}
        aria-label="Remove sort"
        title="Remove"
      >
        ✕
      </button>

      {/* Drag handle */}
      <button
        className="ml-0.5 rounded p-[3px] text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => onDragStart(index, e)}
        onDragEnd={onDragEnd}
        aria-label="Reorder"
        title="Drag to reorder"
      >
        <IconDotsSixVertical className="h-4 w-4" />
      </button>

      {/* Field Picker */}
      {fieldOpen && (
        <FieldPickerPopover
          anchorEl={fieldBtnRef.current}
          fields={fields}
          selectedId={currentField?.id}
          iconFor={iconFor}
          onSelect={(id) => {
            onChange(index, { fieldId: id });
            setFieldOpen(false);
          }}
          onClose={() => setFieldOpen(false)}
        />
      )}

      {/* Direction Picker */}
      {dirOpen && (
        <DirectionMenu
          anchorEl={dirBtnRef.current}
          value={rule.dir}
          ascLabel={isNumeric ? "1 → 9" : "A → Z"}
          descLabel={isNumeric ? "9 → 1" : "Z → A"}
          onSelect={(val) => {
            onChange(index, { dir: val });
            setDirOpen(false);
          }}
          onClose={() => setDirOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- Field popover ---------- */

function FieldPickerPopover({
  anchorEl,
  fields,
  selectedId,
  iconFor,
  onSelect,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  fields: SortField[];
  selectedId?: string;
  iconFor: (f: SortField) => JSX.Element;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rect = useMemo(() => anchorEl?.getBoundingClientRect() ?? null, [anchorEl]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClickAway = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!panelRef.current) return;
      if (!panelRef.current.contains(t!) && !anchorEl?.contains(t!)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickAway);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickAway);
    };
  }, [onClose, anchorEl]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return fields;
    return fields.filter((f) => f.label.toLowerCase().includes(s));
  }, [q, fields]);

  if (!mounted || !rect) return null;

  return createPortal(
    <div
      ref={panelRef}
      data-sort-popover="true"
      className="fixed z-[60] box-border rounded-md border border-neutral-300 bg-white shadow-lg"
      style={{
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: rect.width,
      }}
    >
      {/* Search */}
      <div className="px-2.5 py-1.5">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a field"
          className="h-7 w-full bg-transparent p-0 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none border-none focus:ring-0"
        />
      </div>

      {/* List */}
      <div className="max-h-[260px] overflow-auto px-1 pb-1.5" style={{ maxHeight: PICKER_MAX_H }}>
        {filtered.map((f) => {
          const isSelected = f.id === selectedId;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[12px] ${
                isSelected ? "bg-neutral-100" : "hover:bg-neutral-100"
              }`}
            >
              <span className="shrink-0">{iconFor(f)}</span>
              <span className="min-w-0 flex-1 truncate text-neutral-800">{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Direction popover ---------- */

function DirectionMenu({
  anchorEl,
  value,
  ascLabel,
  descLabel,
  onSelect,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  value: SortDir;
  ascLabel: string;
  descLabel: string;
  onSelect: (v: SortDir) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rect = useMemo(() => anchorEl?.getBoundingClientRect() ?? null, [anchorEl]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClickAway = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!panelRef.current) return;
      if (!panelRef.current.contains(t!) && !anchorEl?.contains(t!)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickAway);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickAway);
    };
  }, [onClose, anchorEl]);

  if (!mounted || !rect) return null;

  const Item = ({ v, label }: { v: SortDir; label: string }) => (
    <button
      role="option"
      aria-selected={value === v}
      onClick={() => onSelect(v)}
      className={`flex w-full items-center rounded-[6px] px-2.5 py-1.5 text-left text-[12px] ${
        value === v ? "bg-neutral-100" : "hover:bg-neutral-100"
      }`}
    >
      {label}
    </button>
  );

  return createPortal(
    <div
      ref={panelRef}
      data-sort-popover="true"
      className="fixed z-[60] rounded-md border border-neutral-300 bg-white shadow-lg"
      style={{
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: rect.width,
      }}
      role="listbox"
    >
      <div className="p-1">
        <Item v="asc" label={ascLabel} />
        <Item v="desc" label={descLabel} />
      </div>
    </div>,
    document.body
  );
}

/* ---------- Tiny chevron ---------- */

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
