"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import React, { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import AddColumnMenu from "~/app/_components/AddColumnMenu";

type DataGridProps<TData> = {
  table: Table<TData>;
  allSelected: boolean;
  /** Parent (BasePage) is the vertical scroller. We DO NOT mutate this ref. */
  containerRef: RefObject<HTMLDivElement | null>;
  onAddRow: () => void;
  onAddTextColumn: () => void;
  onAddNumberColumn: () => void;
  showLoadingMore?: boolean;
  /** IDs of columns that are currently sorted (for column highlighting) */
  sortedFieldIds?: string[];
};

const CELL_W = 180;
const CELL_H = 36;

const INDEX_W = 84;
const INDEX_H = 36;

const ADD_BTN_W = 94;
const GAP_W = 24; // space to the right of “+”

// Sort highlight colors (header lighter, body a touch deeper)
const SORT_HEADER_BG = "#FEF6F1";
const SORT_CELL_BG = "#FBEFE6";

export default function DataGrid<TData>({
  table,
  allSelected,
  containerRef,
  onAddRow,
  onAddTextColumn,
  onAddNumberColumn,
  showLoadingMore,
  sortedFieldIds,
}: DataGridProps<TData>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  // inner ref for horizontal scroll sync only (NOT vertical)
  const gridRef = useRef<HTMLDivElement | null>(null);
  const setGridRef = (el: HTMLDivElement | null) => {
    gridRef.current = el;
  };

  // fixed bottom scrollbar
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);

  // Consolidated bar UI state
  const [bar, setBar] = useState(() => ({
    left: 0,
    width: 0,
    contentW: 0,
    showH: false,
  }));
  const showHRef = useRef(bar.showH); // for hysteresis

  const tableElRef = useRef<HTMLTableElement | null>(null);

  // Make lookups cheap
  const sortedSet = useMemo(() => new Set(sortedFieldIds ?? []), [sortedFieldIds]);

  // ---------- layout / measurement ----------
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let raf: number | null = null;
    let destroyed = false;

    const round = (n: number) => Math.max(0, Math.round(n));
    const schedule = () => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    // Hysteresis band in px to avoid show/hide flip-flop
    const HYST = 8;

    const update = () => {
      if (destroyed) return;

      const vScroller = containerRef.current ?? grid;
      const rect = vScroller.getBoundingClientRect();

      const rectLeft = round(rect.left);
      const rectWidth = round(rect.width);

      const nextLeft = Math.min(rectLeft, window.innerWidth);
      const nextWidth = Math.min(rectWidth, Math.max(0, window.innerWidth - rectLeft));

      // visible columns -> expected width
      const vCols = table.getVisibleLeafColumns().length;
      const expectedWidth =
        (vCols > 0 ? INDEX_W : 0) + Math.max(0, vCols - 1) * CELL_W + ADD_BTN_W + GAP_W;

      // prefer real DOM scrollWidth (of the grid content) vs expectation
      const domScrollW = grid.scrollWidth || 0;
      const nextContentW = Math.max(expectedWidth, domScrollW);

      const clientW = round(grid.clientWidth);

      // Hysteresis rules
      let nextShowH = showHRef.current;
      if (!showHRef.current) {
        nextShowH = nextContentW >= clientW + HYST;
      } else {
        nextShowH = nextContentW > clientW - HYST;
      }

      // only commit if something actually changed
      setBar((prev) => {
        if (
          prev.left === nextLeft &&
          prev.width === nextWidth &&
          prev.contentW === nextContentW &&
          prev.showH === nextShowH
        ) {
          return prev;
        }
        showHRef.current = nextShowH;
        return {
          left: nextLeft,
          width: nextWidth,
          contentW: nextContentW,
          showH: nextShowH,
        };
      });
    };

    // initial
    schedule();

    // Observe ONLY the grid container; not the table DOM
    const roGrid = new ResizeObserver(schedule);
    roGrid.observe(grid);

    const onResize = () => schedule();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      destroyed = true;
      if (raf != null) cancelAnimationFrame(raf);
      roGrid.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // IMPORTANT: keep deps stable; do NOT include `table`
  }, [containerRef]);

  // ---------- sync main/grid horizontal scroll with fixed bar ----------
  const syncingRef = useRef(false);
  const onMainScroll: React.UIEventHandler<HTMLDivElement> = () => {
    if (syncingRef.current) return;
    const grid = gridRef.current;
    const barEl = bottomScrollRef.current;
    if (!grid || !barEl) return;
    const next = grid.scrollLeft;
    if (Math.abs(barEl.scrollLeft - next) < 1) return;
    syncingRef.current = true;
    barEl.scrollLeft = next;
    requestAnimationFrame(() => (syncingRef.current = false));
  };
  const onBarScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    if (syncingRef.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    const next = (e.currentTarget as HTMLDivElement).scrollLeft;
    if (Math.abs(grid.scrollLeft - next) < 1) return;
    syncingRef.current = true;
    grid.scrollLeft = next;
    requestAnimationFrame(() => (syncingRef.current = false));
  };
  const onBarWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const barEl = bottomScrollRef.current;
    if (!barEl) return;
    barEl.scrollLeft += e.deltaY || e.deltaX;
  };

  return (
    <>
      <style jsx global>{`
        .gridScrollX {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .gridScrollX::-webkit-scrollbar {
          height: 0px;
        }
        /* inert, borderless cells under the + */
        .plus-gutter {
          border: 0 !important;
          background: white !important;
          pointer-events: none;
        }
        /* inner divider (LEFT of +) to close table; applied to gutter cells and + header */
        .plus-divider-left {
          border-left: 1px solid rgb(229, 231, 235) !important;
        }
        /* last data cell must not draw its own right gridline */
        .no-right-border {
          border-right-width: 0 !important;
        }
        /* whitespace column to the far right */
        .gap-col {
          border: 0 !important;
          background: white !important;
          pointer-events: none;
        }
      `}</style>

      {/* NOTE: no vertical overflow here. Parent handles vertical scroll. */}
      <div
        ref={setGridRef}
        className="gridScrollX overflow-x-auto pb-8 w-full"
        onScroll={onMainScroll}
      >
        <table
          ref={tableElRef}
          className="min-w-max border-separate border-spacing-0 text-[13px]"
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="group">
                {hg.headers.map((h, i, arr) => {
                  const isIndex = i === 0;
                  const isLastData = i === arr.length - 1;
                  const isSortedCol = !isIndex && sortedSet.has(h.column.id);

                  return (
                    <th
                      key={h.id}
                      className={[
                        "sticky top-0 z-10 border-b border-neutral-200 px-2 py-0 text-left font-normal",
                        allSelected ? "bg-blue-50" : "bg-neutral-50",
                        isIndex ? "" : isLastData ? "" : "border-r",
                      ].join(" ")}
                      style={{
                        width: isIndex ? INDEX_W : CELL_W,
                        minWidth: isIndex ? INDEX_W : CELL_W,
                        maxWidth: isIndex ? INDEX_W : CELL_W,
                        // sorted header gets lighter highlight
                        backgroundColor: isSortedCol ? SORT_HEADER_BG : undefined,
                      }}
                    >
                      <div
                        className="flex h-[36px] items-center"
                        style={{ paddingRight: i === 0 ? 15 : undefined }}
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </div>
                    </th>
                  );
                })}

                {/* “+” header */}
                <th
                  className={[
                    "relative sticky top-0 z-10",
                    "border-b border-neutral-200",
                    "plus-divider-left",
                    "bg-white",
                    "p-0 text-left font-normal",
                  ].join(" ")}
                  style={{
                    width: ADD_BTN_W,
                    minWidth: ADD_BTN_W,
                    maxWidth: ADD_BTN_W,
                    borderRight: "1px solid rgb(229, 231, 235)",
                  }}
                >
                  <button
                    ref={addBtnRef}
                    type="button"
                    title="Add column"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex h-[36px] w-full items-center justify-center text-[16px] leading-none text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors focus:outline-none focus:ring-0"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    +
                  </button>

                  {menuOpen && (
                    <AddColumnMenu
                      anchorEl={addBtnRef.current}
                      onAddText={() => {
                        onAddTextColumn();
                        setMenuOpen(false);
                      }}
                      onAddNumber={() => {
                        onAddNumberColumn();
                        setMenuOpen(false);
                      }}
                      onClose={() => setMenuOpen(false)}
                    />
                  )}
                </th>

                {/* right-side breathing room */}
                <th
                  className="sticky top-0 bg-white gap-col"
                  style={{ width: GAP_W, minWidth: GAP_W, maxWidth: GAP_W }}
                />
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((r) => {
              const selected = r.getIsSelected();
              const cells = r.getVisibleCells();
              const lastDataIndex = cells.length - 1;

              return (
                <tr key={r.id} className="group hover:bg-neutral-50">
                  {cells.map((c, i) => {
                    const isIndex = i === 0;
                    const isLastData = i === lastDataIndex;
                    const isSortedCol = !isIndex && sortedSet.has(c.column.id);

                    return (
                      <td
                        key={c.id}
                        className={[
                          "border-b border-neutral-200 p-0",
                          isLastData ? "no-right-border" : "border-r",
                          selected ? "bg-blue-50" : "",
                          isIndex
                            ? `${
                                selected
                                  ? "bg-blue-50"
                                  : "bg-white group-hover:bg-neutral-50"
                              } text-center align-middle`
                            : "",
                        ].join(" ")}
                        style={{
                          width: isIndex ? INDEX_W : CELL_W,
                          minWidth: isIndex ? INDEX_W : CELL_W,
                          maxWidth: isIndex ? INDEX_W : CELL_W,
                          // sorted body cells get slightly deeper highlight
                          backgroundColor: isSortedCol ? SORT_CELL_BG : undefined,
                        }}
                      >
                        {isIndex ? (
                          <div
                            className="flex items-center justify-center"
                            style={{ height: INDEX_H, paddingRight: 15 }}
                          >
                            {flexRender(c.column.columnDef.cell, c.getContext())}
                          </div>
                        ) : (
                          <div className="relative flex items-center" style={{ height: CELL_H }}>
                            {flexRender(c.column.columnDef.cell, c.getContext())}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* gutter under + */}
                  <td
                    aria-hidden="true"
                    className="plus-gutter plus-divider-left"
                    style={{
                      width: ADD_BTN_W,
                      minWidth: ADD_BTN_W,
                      maxWidth: ADD_BTN_W,
                      height: CELL_H,
                    }}
                  />
                  {/* gap */}
                  <td
                    aria-hidden="true"
                    className="gap-col"
                    style={{ width: GAP_W, minWidth: GAP_W, maxWidth: GAP_W, height: CELL_H }}
                  />
                </tr>
              );
            })}

            {/* add row */}
            <tr>
              <td
                colSpan={table.getVisibleLeafColumns().length}
                className="border-b border-neutral-200 p-0"
              >
                <button
                  onClick={onAddRow}
                  type="button"
                  aria-label="Add row"
                  className="group flex w-full items-center bg-white transition-colors hover:bg-neutral-50"
                  style={{ height: CELL_H, paddingLeft: 15 }}
                >
                  <span className="pl-3 pr-2 text-neutral-500 group-hover:text-neutral-700">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                  <span className="sr-only">Add row</span>
                </button>
              </td>
              <td
                className="plus-gutter plus-divider-left"
                style={{ width: ADD_BTN_W }}
                aria-hidden="true"
              />
              <td className="gap-col" style={{ width: GAP_W }} aria-hidden="true" />
            </tr>
          </tbody>
        </table>

        {showLoadingMore && (
          <div className="p-3 text-center text-[12px] text-neutral-500">Loading more…</div>
        )}
      </div>

      {/* fixed bottom horizontal scrollbar */}
      {bar.showH && (
        <div
          ref={bottomScrollRef}
          onScroll={onBarScroll}
          onWheel={onBarWheel}
          className="fixed bottom-0 z-30 h-4 overflow-x-scroll overflow-y-hidden bg-transparent border-0 grid-scroll"
          style={{ left: bar.left, width: bar.width }}
        >
          <div style={{ width: bar.contentW, height: 1 }} />
        </div>
      )}
    </>
  );
}
