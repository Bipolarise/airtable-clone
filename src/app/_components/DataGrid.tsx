"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import React, { useEffect, useRef, useState, type RefObject } from "react";
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
};

const CELL_W = 180;
const CELL_H = 32;

const INDEX_W = 84;
const INDEX_H = 36;

const ADD_BTN_W = 94;
const GAP_W = 24; // space to the right of “+”

export default function DataGrid<TData>({
  table,
  allSelected,
  containerRef,
  onAddRow,
  onAddTextColumn,
  onAddNumberColumn,
  showLoadingMore,
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
  const [showHBar, setShowHBar] = useState(false);
  const [scrollContentW, setScrollContentW] = useState(0);

  const tableElRef = useRef<HTMLTableElement | null>(null);

  const [barLeft, setBarLeft] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const update = () => {
      // bar positioning follows the VERTICAL scroller (parent) viewport
      const vScroller = containerRef.current ?? grid;
      const rect = vScroller.getBoundingClientRect();
      setBarLeft(Math.max(0, Math.min(rect.left, window.innerWidth)));
      setBarWidth(Math.max(0, Math.min(rect.width, window.innerWidth - rect.left)));

      const vCols = table.getVisibleLeafColumns().length;
      const expectedWidth =
        (vCols > 0 ? INDEX_W : 0) + Math.max(0, vCols - 1) * CELL_W + ADD_BTN_W + GAP_W;

      const domScrollW = (tableElRef.current?.scrollWidth ?? grid.scrollWidth) || 0;
      const contentW = Math.max(expectedWidth, domScrollW);

      setScrollContentW(contentW);
      setShowHBar(contentW > grid.clientWidth + 1);
    };

    update();
    const roGrid = new ResizeObserver(update);
    roGrid.observe(grid);

    const content = tableElRef.current;
    const roContent = content ? new ResizeObserver(update) : null;
    if (content) roContent!.observe(content);

    const mo = content ? new MutationObserver(update) : null;
    if (content) mo!.observe(content, { attributes: true, childList: true, subtree: true });

    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      roGrid.disconnect();
      roContent?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [containerRef, table]);

  // sync main/grid horizontal scroll with fixed bar
  const syncingRef = useRef(false);
  const onMainScroll: React.UIEventHandler<HTMLDivElement> = () => {
    if (syncingRef.current) return;
    const grid = gridRef.current;
    const bar = bottomScrollRef.current;
    if (!grid || !bar) return;
    const next = grid.scrollLeft;
    if (Math.abs(bar.scrollLeft - next) < 1) return;
    syncingRef.current = true;
    bar.scrollLeft = next;
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
    const bar = bottomScrollRef.current;
    if (!bar) return;
    bar.scrollLeft += e.deltaY || e.deltaX;
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
                          <div className="flex items-center" style={{ height: CELL_H }}>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                  <span className="sr-only">Add row</span>
                </button>
              </td>
              <td className="plus-gutter plus-divider-left" style={{ width: ADD_BTN_W }} aria-hidden="true" />
              <td className="gap-col" style={{ width: GAP_W }} aria-hidden="true" />
            </tr>
          </tbody>
        </table>

        {showLoadingMore && (
          <div className="p-3 text-center text-[12px] text-neutral-500">Loading more…</div>
        )}
      </div>

      {/* fixed bottom horizontal scrollbar */}
      {showHBar && (
        <div
          ref={bottomScrollRef}
          onScroll={onBarScroll}
          onWheel={onBarWheel}
          className="fixed bottom-0 z-30 h-5 overflow-x-scroll overflow-y-hidden border-t border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
          style={{ left: barLeft, width: barWidth }}
        >
          <div style={{ width: scrollContentW, height: 1 }} />
        </div>
      )}
    </>
  );
}
