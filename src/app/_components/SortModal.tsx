"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconQuestion } from "~/app/_icons/IconQuestion";

import { IconFieldName } from "~/app/_icons/IconFieldName";
import { IconFieldNotes } from "~/app/_icons/IconFieldNotes";
import { IconFieldAssignee } from "~/app/_icons/IconFieldAssignee";
import { IconFieldStatus } from "~/app/_icons/IconFieldStatus";
import { IconFieldAttachment } from "~/app/_icons/IconFieldAttachment";
import { IconFieldNumber } from "~/app/_icons/IconFieldNumber";
import { IconTinyDot } from "~/app/_icons/IconTinyDot";

export type SortDir = "asc" | "desc";
export type SortRule = { fieldId: string; dir: SortDir };

export type SortField = {
  id: string;
  label: string;
  type: "TEXT" | "NUMBER";
};

type Props = {
  open: boolean;
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  fields: SortField[];
  rules: SortRule[];
  onChangeRules?: React.Dispatch<React.SetStateAction<SortRule[]>>;
  onOpenEditor: (fieldId: string) => void;
};

const WIDTH = 300;
const LIST_MAX_H = 320;
const PAD_X = "px-5.5";
const PAD_Y = "py-1.5";

export default function SortModal({
  open,
  anchorEl,
  onClose,
  fields,
  rules,
  onChangeRules,
  onOpenEditor,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");

  const rect = useMemo(() => anchorEl?.getBoundingClientRect() ?? null, [anchorEl]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose, anchorEl]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((f) => f.label.toLowerCase().includes(q));
  }, [fields, query]);

  const ruleFor = (id: string) => rules.find((r) => r.fieldId === id);

  const removeRule = (id: string) =>
    onChangeRules?.((prev) => prev.filter((r) => r.fieldId !== id));

  const iconFor = (f: SortField) => {
    const cls = "h-3.5 w-3.5 text-neutral-600";
    switch (f.label) {
      case "Single line text":
        return <IconFieldNumber className={cls} />;
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

  if (!mounted || !open || !rect) return null;

  // Align right edge of modal to right edge of Sort button, clamped to viewport with 8px gutter
  const left = Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8));

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-50 select-none rounded-md border border-neutral-200 bg-white shadow-lg"
      style={{
        top: rect.bottom + 6,
        left,
        width: WIDTH,
      }}
    >
      {/* Header */}
      <div className="flex items-center pl-4 pr-2.5 pt-3 pb-2">
        <span className="text-[12px] font-medium text-neutral-600">Sort by</span>
        <IconQuestion className="ml-1.5 h-[15px] w-[15px] text-neutral-400" />
      </div>
      <div className="mx-4 h-px bg-neutral-200" />

      {/* Search */}
      <div className={`${PAD_X} ${PAD_Y}`}>
        <div className="flex items-center gap-2">
          <svg
            className="h-[14px] w-[14px] flex-none text-[#166ee1]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a field"
            className="flex-1 h-6 bg-transparent text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none border-0 focus:border-0 focus:ring-0"
          />
        </div>
      </div>

      {/* Field list */}
      <div className="overflow-auto px-1 pb-1.5" style={{ maxHeight: LIST_MAX_H }}>
        {filtered.map((f) => {
          const r = ruleFor(f.id);
          return (
            <button
              key={f.id}
              onClick={() => {
                onClose();
                onOpenEditor(f.id);
              }}
              className={`flex w-full cursor-pointer items-center gap-2 rounded ${PAD_X} ${PAD_Y} text-left hover:bg-neutral-100`}
            >
              <span className="shrink-0">{iconFor(f)}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-800">
                {f.label}
              </span>

              {/* small “remove” affordance only if a rule already exists */}
              {r && (
                <button
                  className="ml-1 text-[11px] text-neutral-400 hover:text-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRule(f.id);
                  }}
                  title="Remove rule"
                >
                  ×
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
