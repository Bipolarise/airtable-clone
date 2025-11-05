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
import FilterModal from "~/app/_components/FilterModal";
import AddConditionModal from "~/app/_components/AddConditionModal";
import HideFieldsModal, {
  type HideFieldsModalField,
} from "~/app/_components/HideFieldsModal";

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

  /** Optional: lift column visibility to parent */
  onChangeHiddenMap?: (hiddenById: Record<string, boolean>) => void;
  seedHiddenMap?: Record<string, boolean>;

  /** NEW: hook up to the external left-side ViewsPanel */
  onToggleViews?: () => void;
  onViewsHoverStart?: () => void;
  onViewsHoverEnd?: () => void;
  /** NEW: label for the current view (e.g., "Grid view 2") */
  activeViewName?: string;
};

/* ---- constants ---- */
const FILTER_ACTIVE_BG = "#DEF7D9";
const FILTER_ACTIVE_RING_BASE = "#DEF7D9";
const FILTER_ACTIVE_RING_HOVER = "#6B9E6F";

/* ---- Exclusions: labels that can NEVER be hidden or shown in the modal ---- */
const EXCLUDED_LABELS = new Set(["name"]);
const isExcluded = (f: FieldOptionForModal) =>
  EXCLUDED_LABELS.has(f.label.toLowerCase());

/* -------------------------------- Component -------------------------------- */
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
    onViewsHoverStart,
    onViewsHoverEnd,
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

  // If a seed is provided, force excluded fields (e.g., Name) to be visible.
  useEffect(() => {
    if (!seedHiddenMap) return;
    const corrected: Record<string, boolean> = { ...seedHiddenMap };
    for (const f of fieldOptions) if (isExcluded(f)) corrected[f.id] = false;
    setHiddenById(corrected);
  }, [seedHiddenMap, fieldOptions]);

  useEffect(() => {
    onChangeHiddenMap?.(hiddenById);
  }, [hiddenById, onChangeHiddenMap]);

  const toggleHidden = (id: string) =>
    setHiddenById((m) => ({ ...m, [id]: !m[id] }));

  // Hide all fields that are *in the modal* (exclude Name)
  const hideAll = () =>
    setHiddenById((m) => {
      const next = { ...m };
      for (const f of fieldOptions) {
        next[f.id] = isExcluded(f) ? false : true;
      }
      return next;
    });

  // Show all fields
  const showAll = () =>
    setHiddenById((m) => {
      const next = { ...m };
      for (const f of fieldOptions) next[f.id] = false;
      return next;
    });

  const iconForLabel = (label: string, type: "TEXT" | "NUMBER"): ReactNode => {
    const cls = "h-4 w-4 text-neutral-700";
    switch (label) {
      case "Name":
        return (
          <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.44187 3.26606C8.35522 3.10237 8.18518 3 7.99998 3C7.81477 3 7.64474 3.10237 7.55808 3.26606L3.05808 11.7661C2.92888 12.0101 3.02198 12.3127 3.26603 12.4419C3.51009 12.5711 3.81267 12.478 3.94187 12.2339L5.12455 10H10.8754L12.0581 12.2339C12.1873 12.478 12.4899 12.5711 12.7339 12.4419C12.978 12.3127 13.0711 12.0101 12.9419 11.7661L8.44187 3.26606ZM10.346 9L7.99998 4.56863L5.65396 9H10.346Z"
            />
          </svg>
        );
      case "Notes":
        return (
          <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="nonzero"
              d="M4.24999 3C4.43937 3 4.6125 3.107 4.6972 3.27639L6.4472 6.77639C6.5707 7.02338 6.47058 7.32372 6.22359 7.44721C5.9766 7.57071 5.67627 7.4706 5.55277 7.22361L5.17327 6.4646H3.3267L2.9472 7.22361C2.82371 7.4706 2.52337 7.57071 2.27638 7.44721C2.02939 7.32372 1.92928 7.02338 2.05277 6.77639L3.80277 3.27639C3.88747 3.107 4.0606 3 4.24999 3ZM3.8267 5.4646H4.67327L4.24999 4.61803L3.8267 5.4646Z M7.5 3.75C7.22386 3.75 7 3.97386 7 4.25C7 4.52614 7.22386 4.75 7.5 4.75H13.5C13.7761 4.75 14 4.52614 14 4.25C14 3.97386 13.7761 3.75 13.5 3.75H7.5Z M8 6.75C8 6.47386 8.22386 6.25 8.5 6.25H11.5C11.7761 6.25 12 6.47386 12 6.75C12 7.02614 11.7761 7.25 11.5 7.25H8.5C8.22386 7.25 8 7.02614 8 6.75Z M2 9.25C2 8.97386 2.22386 8.75 2.5 8.75H13.5C13.7761 8.75 14 8.97386 14 9.25C14 9.52614 13.7761 10.25 13.5 10.25H2.5C2.22386 10.25 2 9.97386 2 9.25Z M2 11.75C2 11.4739 2.22386 11.25 2.5 11.25H11.5C11.7761 11.25 12 11.4739 12 11.75C12 12.0261 11.7761 12.25 11.5 12.25H2.5C2.22386 12.25 2 12.0261 2 11.75Z"
            />
          </svg>
        );
      case "Assignee":
        return (
          <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="nonzero"
              d="M8 9.49951C5.32109 9.49957 2.84382 10.93 1.50451 13.2501C1.43822 13.365 1.42025 13.5014 1.45457 13.6295C1.48888 13.7576 1.57267 13.8668 1.6875 13.9331C1.80235 13.9994 1.93883 14.0173 2.06691 13.983C2.195 13.9487 2.30419 13.8648 2.37048 13.75C3.53197 11.738 5.67677 10.4996 8 10.4995C10.3232 10.4995 12.4681 11.7379 13.6295 13.75C13.6958 13.8648 13.805 13.9487 13.9331 13.983C14.0612 14.0173 14.1976 13.9994 14.3125 13.9331C14.4273 13.8668 14.5111 13.7576 14.5454 13.6295C14.5797 13.5014 14.5611 13.365 14.4955 13.2501C13.1563 10.9299 10.679 9.49944 8 9.49951Z M8 1.5C5.52065 1.5 3.5 3.52065 3.5 6C3.5 8.47935 5.52065 10.4995 8 10.4995C10.4793 10.4995 12.5 8.47935 12.5 6C12.5 3.52065 10.4793 1.5 8 1.5ZM8 2.5C9.9389 2.5 11.5 4.0611 11.5 6C11.5 7.9389 9.9389 9.49951 8 9.49951C6.0611 9.49951 4.5 7.9389 4.5 6C4.5 4.0611 6.0611 2.5 8 2.5Z"
            />
          </svg>
        );
      case "Status":
        return (
          <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="nonzero"
              d="M5.77625 6.75073C5.64385 6.74375 5.5141 6.78963 5.41553 6.8783C5.36671 6.92222 5.32702 6.97532 5.29873 7.03458C5.27044 7.09384 5.2541 7.1581 5.25064 7.22367C5.24719 7.28925 5.25668 7.35486 5.27858 7.41677C5.30048 7.47868 5.33437 7.53566 5.3783 7.58447L7.6283 10.0845C7.67519 10.1366 7.73251 10.1782 7.79655 10.2068C7.86058 10.2353 7.9299 10.25 8 10.25C8.0701 10.25 8.13942 10.2353 8.20345 10.2068C8.26749 10.1782 8.32481 10.1366 8.3717 10.0845L10.6217 7.58447C10.6656 7.53566 10.6995 7.47868 10.7214 7.41677C10.7433 7.35486 10.7528 7.28925 10.7494 7.22367C10.7459 7.1581 10.7296 7.09384 10.7013 7.03458C10.673 6.97532 10.6333 6.92222 10.5845 6.8783C10.5357 6.83437 10.4787 6.80048 10.4168 6.77858C10.3549 6.75668 10.2892 6.74719 10.2237 6.75064C10.1581 6.7541 10.0938 6.77044 10.0346 6.79873C9.97532 6.82702 9.92222 6.86671 9.8783 6.91553L8 9.00256L6.1217 6.91553C6.07777 6.86672 6.02464 6.82704 5.96537 6.79877C5.90609 6.77049 5.84183 6.75417 5.77625 6.75073Z M8 1.5C4.41604 1.5 1.5 4.41604 1.5 8C1.5 11.5839 4.41603 14.5 8 14.5C11.5839 14.5 14.5 11.5839 14.5 8C14.5 4.41603 11.5839 1.5 8 1.5ZM8 2.5C11.0435 2.5 13.5 4.95647 13.5 8C13.5 11.0435 11.0435 13.5 8 13.5C4.95647 13.5 2.5 11.0435 2.5 8C2.5 4.95647 4.95647 2.5 8 2.5Z"
            />
          </svg>
        );
      case "Attachments":
      case "Attachment...":
        return (
          <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="nonzero"
              d="M9.5 1.5C9.36739 1.5 9.24021 1.55268 9.14645 1.64645C9.05268 1.74021 9 1.86739 9 2V5.5C9.00001 5.6326 9.0527 5.75977 9.14646 5.85354C9.24023 5.9473 9.3674 5.99999 9.5 6H13C13.1326 6 13.2598 5.94732 13.3536 5.85355C13.4473 5.75979 13.5 5.63261 13.5 5.5C13.5 5.36739 13.4473 5.24021 13.3536 5.14645C13.2598 5.05268 13.1326 5 13 5H10V2C10 1.86739 9.94732 1.74021 9.85355 1.64645C9.75979 1.55268 9.63261 1.5 9.5 1.5Z M3.5 1.5C2.95364 1.5 2.5 1.95364 2.5 2.5V13.5C2.50007 14.0463 2.95357 14.4999 3.49988 14.5C3.49984 14.5 3.49992 14.5 3.49988 14.5H12.5C13.0464 14.5 13.5 14.0464 13.5 13.5V5.5C13.5 5.36739 13.4473 5.24021 13.3536 5.14645L9.85355 1.64645C9.75979 1.55268 9.63261 1.5 9.5 1.5H3.5ZM3.5 2.5H9.29285L12.5 5.70715V13.5H3.50012L3.5 2.5Z"
            />
          </svg>
        );
      case "Number":
        return (
          <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="nonzero"
              d="M6 2C5.86739 2 5.74021 2.05268 5.64645 2.14645C5.55268 2.24021 5.5 2.36739 5.5 2.5V5.5H2.5C2.36739 5.5 2.24021 5.55268 2.14645 5.64645C2.05268 5.74021 2 5.86739 2 6C2 6.13261 2.05268 6.25979 2.14645 6.35355C2.24021 6.44732 2.36739 6.5 2.5 6.5H5.5V9.5H2.5C2.36739 9.5 2.24021 9.55268 2.14645 9.64645C2.05268 9.74021 2 9.86739 2 10C2 10.1326 2.05268 10.2598 2.14645 10.3536C2.24021 10.4473 2.36739 10.5 2.5 10.5H5.5V13.5C5.5 13.6326 5.55268 13.7598 5.64645 13.8536C5.74021 13.9473 5.86739 14 6 14C6.13261 14 6.25979 13.9473 6.35355 13.8536C6.44732 13.7598 6.5 13.6326 6.5 13.5V10.5H9.5V13.5C9.5 13.6326 9.55268 13.7598 9.64645 13.8536C9.74021 13.9473 9.86739 14 10 14C10.1326 14 10.25979 13.9473 10.3536 13.8536C10.4473 13.7598 10.5 13.6326 10.5 13.5V10.5H13.5C13.6326 10.5 13.7598 10.4473 13.8536 10.3536C13.9473 10.2598 14 10.1326 14 10C14 9.86739 13.9473 9.74021 13.8536 9.64645C13.7598 9.55268 13.6326 9.5 13.5 9.5H10.5V6.5H13.5C13.6326 6.5 13.7598 6.44732 13.8536 6.35355C13.9473 6.25979 14 6.1326 14 6C14 5.86739 13.9473 5.74021 13.8536 5.64645C13.7598 5.55268 13.6326 5.5 13.5 5.5H10.5V2.5C10.5 2.36739 10.4473 2.24021 10.3536 2.14645C10.2598 2.05268 10.1326 2 10 2ZM6.5 6.5H9.5V9.5H6.5V6.5Z"
            />
          </svg>
        );
      default:
        if (type === "NUMBER") {
          return (
            <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2h2v12H4V2zm6 0h2v12h-2V2z" />
            </svg>
          );
        }
        return <span className="h-1 w-1 rounded-full bg-neutral-500 inline-block" />;
    }
  };

  /* Build the list for the modal: exclude Name entirely */
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

  /* ---------------- UI bits ---------------- */
  const filterBtnClass =
    "flex items-center gap-2 rounded px-2 h-7 " +
    (activeCount > 0
      ? "text-neutral-700"
      : "text-neutral-700 transition-colors hover:bg-neutral-100");

  const filterLabel =
    activeCount > 0 && filteredBy ? `Filtered by ${filteredBy}` : "Filter";

  /* ---------------- render ---------------- */
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="flex h-12 items-center justify-between px-4 text-[13px] text-neutral-700">
        {/* LEFT: Views icon + current view */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center rounded px-1.5 py-1 hover:bg-neutral-100"
            onClick={onToggleViews}
            onMouseEnter={onViewsHoverStart}
            onMouseLeave={onViewsHoverEnd}
            aria-label="Views"
            title="Views"
          >
            <IconList className="h-[18px] w-[18px] text-neutral-700" />
          </button>

          <button className="flex items-center gap-2 rounded px-1.5 hover:bg-neutral-100">
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
            className="flex items-center gap-1 rounded px-1.5 transition-colors hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            title="Insert demo rows"
          >
            <span className="whitespace-nowrap">
              {isAddingDemoRows ? "Adding…" : "+100k rows"}
            </span>
          </button>

          {/* Hide / Show fields */}
          <HideFieldsButton
            hideFields={hideFields}
            onToggle={toggleHidden}
            onHideAll={hideAll}
            onShowAll={showAll}
          />

          {/* FILTER pill */}
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

          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconGroup className="h-[14px] w-[14px] text-neutral-600" />
            <span>Group</span>
          </button>

          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconArrowsDownUp className="h-[14px] w-[14px] text-neutral-600" />
            <span>Sort</span>
          </button>

          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconPaintBucket className="h-[14px] w-[14px] text-neutral-600" />
            <span>Color</span>
          </button>

          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconRowHeightSmall className="h-[14px] w-[14px] text-neutral-600" />
          </button>

          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconArrowSquareOut className="h-[14px] w-[14px] text-neutral-600" />
            <span>Share and sync</span>
          </button>

          <button
            onClick={onOpenSearchModal}
            className="flex items-center rounded px-1.5 hover:bg-neutral-100"
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

/* HideFields trigger grouped to keep the main render tidy */
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
  return (
    <>
      <button
        ref={btnRef}
        className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"
        onClick={() => setOpen((o) => !o)}
        title="Hide/show fields"
      >
        <IconEyeSlash className="h-[14px] w-[14px] text-neutral-600" />
        <span>Hide fields</span>
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

/* small util */
function rid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 9)}`;
}
