"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconQuestion } from "~/app/_icons/IconQuestion";

// field icons (same set used elsewhere)
import { IconFieldName } from "~/app/_icons/IconFieldName";
import { IconFieldNotes } from "~/app/_icons/IconFieldNotes";
import { IconFieldAssignee } from "~/app/_icons/IconFieldAssignee";
import { IconFieldStatus } from "~/app/_icons/IconFieldStatus";
import { IconFieldAttachment } from "~/app/_icons/IconFieldAttachment";
import { IconFieldNumber } from "~/app/_icons/IconFieldNumber";
import { IconTinyDot } from "~/app/_icons/IconTinyDot";

type SortDir = "asc" | "desc";
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
  onChangeRules: (next: SortRule[]) => void;
};

const WIDTH = 360;            // ↓ smaller width
const LIST_MAX_H = 320;       // ↓ shorter list
const PAD_X = "px-3";         // compact paddings
const PAD_Y = "py-2";

export default function SortModal({
  open,
  anchorEl,
  onClose,
  fields,
  rules,
  onChangeRules,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");

  const rect = useMemo(() => anchorEl?.getBoundingClientRect() ?? null, [anchorEl]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // close on esc / outside click
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

  const toggleRule = (id: string) => {
    const existing = ruleFor(id);
    if (!existing) {
      onChangeRules([...rules, { fieldId: id, dir: "asc" }]);
      return;
    }
    const nextDir: SortDir = existing.dir === "asc" ? "desc" : "asc";
    onChangeRules(rules.map((r) => (r.fieldId === id ? { ...r, dir: nextDir } : r)));
  };

  const removeRule = (id: string) => onChangeRules(rules.filter((r) => r.fieldId !== id));
  const clearAll = () => onChangeRules([]);

  // ------- icons (same semantics as ViewHeaderBar/page) -------
  const iconFor = (f: SortField) => {
    const cls = "h-4 w-4 text-neutral-600";
    switch (f.label) {
      case "Single line text":
        return <IconFieldNumber className={cls} />; // per your rule

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

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-50 select-none rounded-lg border border-neutral-200 bg-white shadow-xl"
      style={{
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - WIDTH - 12)),
        width: WIDTH,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-neutral-800">Sort by</span>
          <IconQuestion className="h-[14px] w-[14px] text-neutral-400" />
        </div>
        <button
          className="text-[12px] text-neutral-500 hover:text-neutral-700"
          onClick={(e) => {
            e.stopPropagation();
            // hook to “copy from view” as needed
          }}
        >
          Copy from a view
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a field"
            className="h-8 w-full rounded-md border border-neutral-200 pl-7 pr-2 text-[12px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
      </div>

      {/* Field list */}
      <div className="overflow-auto px-1 pb-2" style={{ maxHeight: LIST_MAX_H }}>
        {filtered.map((f) => {
          const r = ruleFor(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleRule(f.id)}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-md ${PAD_X} ${PAD_Y} text-left hover:bg-neutral-100`}
            >
              {/* selection dot */}
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  r ? "bg-neutral-800" : "bg-neutral-300"
                }`}
              />
              {/* field icon */}
              <span className="shrink-0">{iconFor(f)}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-800">
                {f.label}
              </span>

              {/* rule chip */}
              {r && (
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRule(f.id);
                  }}
                  title="Click to toggle asc/desc"
                >
                  {r.dir === "asc" ? "A → Z" : "Z → A"}
                </span>
              )}

              {/* remove chip */}
              {r && (
                <button
                  className="ml-1 text-[12px] text-neutral-400 hover:text-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRule(f.id);
                  }}
                  title="Remove"
                >
                  ✓
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
        <button
          className="text-[12px] text-neutral-500 hover:text-neutral-700"
          onClick={clearAll}
        >
          Clear
        </button>
        <button
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}
