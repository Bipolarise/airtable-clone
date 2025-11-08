"use client";

import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { IconEyeSlash } from "~/app/_icons/IconEyeSlash";
import { IconFunnelSimple } from "~/app/_icons/IconFunnelSimple";
import { IconGroup } from "~/app/_icons/IconGroup";
import { IconArrowsDownUp } from "~/app/_icons/IconArrowsDownUp";
import { IconPaintBucket } from "~/app/_icons/IconPaintBucket";
import { IconRowHeightSmall } from "~/app/_icons/IconRowHeightSmall";
import { IconArrowSquareOut } from "~/app/_icons/IconArrowSquareOut";
import { IconGridFeature } from "~/app/_icons/IconGridFeature";
import { IconList } from "~/app/_icons/IconList";
import { IconFieldName } from "~/app/_icons/IconFieldName";
import { IconFieldNotes } from "~/app/_icons/IconFieldNotes";
import { IconFieldAssignee } from "~/app/_icons/IconFieldAssignee";
import { IconFieldStatus } from "~/app/_icons/IconFieldStatus";
import { IconFieldAttachment } from "~/app/_icons/IconFieldAttachment";
import { IconFieldNumber } from "~/app/_icons/IconFieldNumber";
import FilterModal from "~/app/_components/FilterModal";
import AddConditionModal from "~/app/_components/AddConditionModal";
import HideFieldsModal, { type HideFieldsModalField } from "~/app/_components/HideFieldsModal";
import SortModal, { type SortRule } from "~/app/_components/SortModal";

/* ---------- shared with AddConditionModal ---------- */
export type FieldOptionForModal = {
  id: string;
  label: string;
  type: "TEXT" | "NUMBER";
};

export type OperatorId =
  | "contains"
  | "not_contains"
  | "eq"
  | "empty"
  | "not_empty"
  | "gt"
  | "lt";

export type Condition = {
  id: string;
  join?: "and" | "or";
  fieldId: string | null;
  op: OperatorId;
  value: string;
};

type ViewHeaderBarProps = {
  onAddDemoRows: () => void;
  isAddingDemoRows: boolean;
  search: string;
  onOpenSearchModal: () => void;

  fieldOptions: FieldOptionForModal[];
  conditions: Condition[];
  onChangeConditions: (next: Condition[]) => void;

  onChangeHiddenMap?: (hiddenById: Record<string, boolean>) => void;
  seedHiddenMap?: Record<string, boolean>;

  onToggleViews?: () => void;
  activeViewName?: string;
};

/* ---- constants ---- */
const FILTER_ACTIVE_BG = "#DEF7D9";
const FILTER_ACTIVE_RING_BASE = "#DEF7D9";
const FILTER_ACTIVE_RING_HOVER = "#6B9E6F";

/* Hidden-fields chip colors (light blue pill + darker blue ring on hover) */
const HIDDEN_ACTIVE_BG = "#DEF0FF";
const HIDDEN_ACTIVE_RING_BASE = "#CFE6FF";
const HIDDEN_ACTIVE_RING_HOVER = "#6B90C6";

/* Make all header buttons the same size/hover area */
const BTN = "flex items-center gap-2 rounded px-2 h-7 hover:bg-neutral-100";
const BTN_ICON = "flex items-center rounded px-2 h-7 hover:bg-neutral-100";

/* ---- Exclusions ---- */
const EXCLUDED_LABELS = new Set(["name"]);
const isExcluded = (f: FieldOptionForModal) =>
  EXCLUDED_LABELS.has(f.label.toLowerCase());

function rid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 9)}`;
}
function shallowEqualMap(a: Record<string, boolean>, b: Record<string, boolean>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) if (a[k] !== b[k]) return false;
  return true;
}

export default function ViewHeaderBar(props: ViewHeaderBarProps) {
  const {
    onAddDemoRows,
    isAddingDemoRows,
    search,
    onOpenSearchModal,
    fieldOptions,
    conditions,
    onChangeConditions,
    onChangeHiddenMap,
    onToggleViews,
    activeViewName,
    seedHiddenMap,
  } = props;

  /* ---------------- Filters summary ---------------- */
  const activeConds = useMemo(() => {
    const needsValue = (op: OperatorId) => op !== "empty" && op !== "not_empty";
    return conditions.filter((c) => {
      if (!c.fieldId) return false;
      if (!needsValue(c.op)) return true;
      return String(c.value ?? "").trim().length > 0;
    });
  }, [conditions]);

  const activeCount = activeConds.length;

  const filteredBy = useMemo(() => {
    if (activeCount === 0) return "";
    const labels = activeConds
      .map((c) => fieldOptions.find((f) => f.id === c.fieldId)?.label)
      .filter(Boolean) as string[];
    const seen = new Set<string>();
    const unique = labels.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
    return unique.join(", ");
  }, [activeConds, fieldOptions, activeCount]);

  /* ---------------- Filter modals ---------------- */
  const [filterOpen, setFilterOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [hoveringFilter, setHoveringFilter] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);

  const openAppropriate = () => {
    if (filterOpen || conditionOpen) return setFilterOpen(false), setConditionOpen(false);
    if (conditions.length > 0) setConditionOpen(true);
    else setFilterOpen(true);
  };
  const closeAll = () => (setFilterOpen(false), setConditionOpen(false));

  useEffect(() => {
    if (conditionOpen && conditions.length === 0) {
      setConditionOpen(false);
      setFilterOpen(true);
    }
  }, [conditionOpen, conditions.length]);

  const makeStarterCondition = (): Condition => {
    const first = fieldOptions[0] ?? { id: null, type: "TEXT" as const, label: "" };
    const op: OperatorId = first.type === "NUMBER" ? "gt" : "contains";
    return {
      id: rid(),
      join: conditions.length > 0 ? "and" : undefined,
      fieldId: first.id,
      op,
      value: "",
    };
  };

  /* ---------------- Hide / Show fields ---------------- */
  const [hiddenById, setHiddenById] = useState<Record<string, boolean>>({});
  const lastSentRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!seedHiddenMap) return;
    const corrected: Record<string, boolean> = { ...seedHiddenMap };
    for (const f of fieldOptions) if (isExcluded(f)) corrected[f.id] = false;

    setHiddenById((prev) => (shallowEqualMap(prev, corrected) ? prev : corrected));
    lastSentRef.current = corrected;
  }, [seedHiddenMap, fieldOptions]);

  const commitHiddenMap = (next: Record<string, boolean>) => {
    setHiddenById((prev) => (shallowEqualMap(prev, next) ? prev : next));
    if (!shallowEqualMap(next, lastSentRef.current)) {
      lastSentRef.current = next;
      onChangeHiddenMap?.(next);
    }
  };

  const toggleHidden = (id: string) =>
    commitHiddenMap({ ...hiddenById, [id]: !hiddenById[id] });
  const hideAll = () => {
    const next: Record<string, boolean> = { ...hiddenById };
    for (const f of fieldOptions) next[f.id] = isExcluded(f) ? false : true;
    commitHiddenMap(next);
  };
  const showAll = () => {
    const next: Record<string, boolean> = { ...hiddenById };
    for (const f of fieldOptions) next[f.id] = false;
    commitHiddenMap(next);
  };

  const iconForLabel = (label: string, type: "TEXT" | "NUMBER"): ReactNode => {
    const cls = "h-4 w-4 text-neutral-700";

    switch (label) {
      case "Name":
        return <IconFieldName className={cls} />;

      case "Notes":
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
        // Make generic Single line text (type === "TEXT") use the Number icon too.
        if (type === "TEXT") return <IconFieldName className={cls} />;
        if (type === "NUMBER") return <IconFieldNumber className={cls} />;

        // (shouldn't hit, but keep a tiny dot as a final fallback)
        return <span className="inline-block h-1 w-1 rounded-full bg-neutral-500" />;
    }
  };

  const hideFields: HideFieldsModalField[] = useMemo(
    () =>
      fieldOptions
        .filter((f) => !isExcluded(f))
        .map((f) => ({
          id: f.id,
          label: f.label,
          hidden: !!hiddenById[f.id],
          type: f.type === "NUMBER" ? "NUMBER" : "TEXT",
          icon: iconForLabel(f.label, f.type),
        })),
    [fieldOptions, hiddenById]
  );

  const filterBtnClass =
    "flex items-center gap-2 rounded px-2 h-7 " +
    (activeCount > 0
      ? "text-neutral-700"
      : "text-neutral-700 transition-colors hover:bg-neutral-100");

  const filterLabel =
    activeCount > 0 && filteredBy ? `Filtered by ${filteredBy}` : "Filter";

  /* ---------------- Sort modal ---------------- */
  const [sortOpen, setSortOpen] = useState(false);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="flex h-12 items-center justify-between px-4 text-[13px] text-neutral-700">
        {/* LEFT */}
        <div className="flex items-center gap-2">
          <button
            className={BTN_ICON}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleViews?.();
            }}
            aria-label="Views"
            title="Views"
          >
            <IconList className="h-[18px] w-[18px] text-neutral-700" />
          </button>

          <button className={BTN}>
            <IconGridFeature className="h-4 w-4 text-[#166ee1]" />
            <span className="font-medium text-neutral-800">
              {activeViewName ?? "Grid view"}
            </span>
            <svg
              className="text-neutral-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* RIGHT */}
        <div className="relative flex flex-wrap items-center gap-3 text-[12px]">
          <button
            onClick={onAddDemoRows}
            disabled={isAddingDemoRows}
            className={`${BTN} transition-colors active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50`}
            title="Insert demo rows"
          >
            <span className="whitespace-nowrap">
              {isAddingDemoRows ? "Adding…" : "+100k rows"}
            </span>
          </button>

          <HideFieldsButton
            hideFields={hideFields}
            onToggle={toggleHidden}
            onHideAll={hideAll}
            onShowAll={showAll}
          />

          <button
            ref={filterBtnRef}
            onClick={openAppropriate}
            className={filterBtnClass}
            onMouseEnter={() => setHoveringFilter(true)}
            onMouseLeave={() => setHoveringFilter(false)}
            style={
              activeCount > 0
                ? {
                    backgroundColor: FILTER_ACTIVE_BG,
                    boxShadow: `0 0 0 ${hoveringFilter ? 2 : 1}px ${
                      hoveringFilter ? FILTER_ACTIVE_RING_HOVER : FILTER_ACTIVE_RING_BASE
                    } inset`,
                  }
                : undefined
            }
            title={activeCount > 0 ? filterLabel : "Filter"}
          >
            <IconFunnelSimple className="h-[14px] w-[14px] text-neutral-600" />
            <span className="text-neutral-700">{filterLabel}</span>
          </button>

          {filterOpen && (
            <FilterModal
              anchorEl={filterBtnRef.current}
              onClose={closeAll}
              onRequestAddCondition={() => {
                const starter = makeStarterCondition();
                onChangeConditions([...conditions, starter]);
                setFilterOpen(false);
                setConditionOpen(true);
              }}
            />
          )}

          {conditionOpen && (
            <AddConditionModal
              anchorEl={filterBtnRef.current}
              onClose={closeAll}
              fieldOptions={fieldOptions}
              conditions={conditions}
              onChangeConditions={onChangeConditions}
            />
          )}

          <button className={BTN}>
            <IconGroup className="h-[14px] w-[14px] text-neutral-600" />
            <span>Group</span>
          </button>

          {/* SORT */}
          <button
            ref={sortBtnRef}
            className={BTN}
            onClick={() => setSortOpen(true)}
            title="Sort"
          >
            <IconArrowsDownUp className="h-[14px] w-[14px] text-neutral-600" />
            <span>Sort</span>
          </button>

          {sortOpen && (
            <SortModal
              open={sortOpen}
              anchorEl={sortBtnRef.current}
              onClose={() => setSortOpen(false)}
              /* all current table fields */
              fields={fieldOptions.map((f) => ({
                id: f.id,
                label: f.label,
                type: f.type,
              }))}
              rules={sortRules}
              onChangeRules={setSortRules}
            />
          )}

          <button className={BTN}>
            <IconPaintBucket className="h-[14px] w-[14px] text-neutral-600" />
            <span>Color</span>
          </button>

          <button className={BTN_ICON}>
            <IconRowHeightSmall className="h/[14px] w/[14px] text-neutral-600" />
          </button>

          <button className={BTN}>
            <IconArrowSquareOut className="h-[14px] w-[14px] text-neutral-600" />
            <span>Share and sync</span>
          </button>

          <button
            onClick={onOpenSearchModal}
            className={BTN_ICON}
            aria-label="Open search"
            title={search ? `Search: ${search}` : "Search"}
          >
            <svg
              className="text-neutral-600"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function HideFieldsButton({
  hideFields,
  onToggle,
  onHideAll,
  onShowAll,
}: {
  hideFields: HideFieldsModalField[];
  onToggle: (id: string) => void;
  onHideAll: () => void;
  onShowAll: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  const hiddenCount = hideFields.reduce((n, f) => n + (f.hidden ? 1 : 0), 0);
  const hasHidden = hiddenCount > 0;
  const label = hasHidden
    ? `${hiddenCount} hidden field${hiddenCount === 1 ? "" : "s"}`
    : "Hide fields";

  /* Hover ring for the blue pill */
  const [hovering, setHovering] = useState(false);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        title={hasHidden ? label : "Hide/show fields"}
        className={`${BTN} ${hasHidden ? "text-neutral-800" : ""}`}
        style={
          hasHidden
            ? {
                backgroundColor: HIDDEN_ACTIVE_BG,
                boxShadow: `0 0 0 ${hovering ? 2 : 1}px ${
                  hovering ? HIDDEN_ACTIVE_RING_HOVER : HIDDEN_ACTIVE_RING_BASE
                } inset`,
              }
            : undefined
        }
      >
        <IconEyeSlash
          className={`h-[14px] w-[14px] ${hasHidden ? "text-neutral-700" : "text-neutral-600"}`}
        />
        <span>{label}</span>
      </button>

      {open && (
        <HideFieldsModal
          anchorEl={btnRef.current}
          onClose={() => setOpen(false)}
          fields={hideFields}
          onToggle={onToggle}
          onHideAll={onHideAll}
          onShowAll={onShowAll}
        />
      )}
    </>
  );
}
