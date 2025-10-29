"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import { useState, useRef, type RefObject } from "react";
import AddColumnMenu from "~/app/_components/AddColumnMenu";

type DataGridProps<TData> = {
  table: Table<TData>;
  allSelected: boolean;
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

// width for the trailing + header cell (94px wide now)
const ADD_BTN_W = 94;

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
  const addBtnWrapperRef = useRef<HTMLTableCellElement | null>(null);

  return (
    <div ref={containerRef} className="overflow-auto">
      <table className="min-w-max border-separate border-spacing-0 text-[13px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="group">
              {hg.headers.map((h, i) => {
                const isIndex = i === 0;
                return (
                  <th
                    key={h.id}
                    className={[
                      "sticky top-0 z-10 border-b border-neutral-200 px-2 py-0 text-left font-normal",
                      allSelected ? "bg-blue-50" : "bg-neutral-50",
                      isIndex ? "" : "border-r",
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
                        : flexRender(
                            h.column.columnDef.header,
                            h.getContext()
                          )}
                    </div>
                  </th>
                );
              })}

              {/* "+" header cell with dropdown trigger */}
              <th
                ref={addBtnWrapperRef}
                className={[
                  "relative sticky top-0 z-10",
                  "border-b border-r border-neutral-200",
                  "bg-white",
                  "p-0 text-left font-normal",
                ].join(" ")}
                style={{
                  width: ADD_BTN_W,
                  minWidth: ADD_BTN_W,
                  maxWidth: ADD_BTN_W,
                }}
              >
                <button
                  type="button"
                  title="Add column"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={[
                    "flex h-[36px] w-full items-center justify-center",
                    "text-[16px] leading-none text-neutral-700",
                    "hover:bg-neutral-100 active:bg-neutral-200",
                    "transition-colors",
                  ].join(" ")}
                >
                  +
                </button>

                {menuOpen && (
                  <div className="absolute left-1/2 top-full -translate-x-1/2">
                    <AddColumnMenu
                      onAddText={onAddTextColumn}
                      onAddNumber={onAddNumberColumn}
                      onClose={() => setMenuOpen(false)}
                    />
                  </div>
                )}
              </th>
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((r) => {
            const selected = r.getIsSelected();

            // We don't gray-hover first data row (index 0)
            const shouldHoverGray = r.index !== 0;

            return (
              <tr
                key={r.id}
                className={[
                  "group",
                  shouldHoverGray ? "hover:bg-neutral-50" : "",
                ].join(" ")}
              >
                {r.getVisibleCells().map((c, i) => {
                  const isIndex = i === 0;

                  return (
                    <td
                      key={c.id}
                      className={[
                        "border-b border-neutral-200 p-0",
                        isIndex ? "" : "border-r",
                        selected ? "bg-blue-50" : "",
                        isIndex
                          ? `${
                              selected
                                ? "bg-blue-50"
                                : "bg-white"
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
                          {flexRender(
                            c.column.columnDef.cell,
                            c.getContext()
                          )}
                        </div>
                      ) : (
                        <div
                          className="flex items-center"
                          style={{ height: CELL_H }}
                        >
                          {flexRender(
                            c.column.columnDef.cell,
                            c.getContext()
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                {/* no trailing cell for body rows */}
              </tr>
            );
          })}

          {/* Add row full-width bar */}
          <tr>
            <td
              colSpan={table.getVisibleLeafColumns().length}
              className="border-b border-r border-neutral-200 p-0"
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
          </tr>
        </tbody>
      </table>

      {showLoadingMore && (
        <div className="p-3 text-center text-[12px] text-neutral-500">
          Loading more…
        </div>
      )}
    </div>
  );
}
