"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import type { RefObject } from "react";

type DataGridProps<TData> = {
  table: Table<TData>;
  allSelected: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  onAddRow: () => void;
  showLoadingMore?: boolean;
};

const CELL_W = 180; // other columns width
const CELL_H = 32;  // other columns height

const INDEX_W = 84; // numbers column width
const INDEX_H = 36; // numbers column height

export default function DataGrid<TData>({
  table,
  allSelected,
  containerRef,
  onAddRow,
  showLoadingMore,
}: DataGridProps<TData>) {
  return (
    <div ref={containerRef} className="overflow-auto">
      {/* center + cap width like Airtable */}
      <div className="mr-auto max-w-[1120px] md:max-w-[1280px] pr-4">
        <table className="w-auto border-separate border-spacing-0 text-[13px]">
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
                        isIndex ? "" : "border-r", // keep: no right border on first (numbers) column
                      ].join(" ")}
                      style={{
                        width: isIndex ? INDEX_W : CELL_W,
                        minWidth: isIndex ? INDEX_W : CELL_W,
                        maxWidth: isIndex ? INDEX_W : CELL_W,
                      }}
                    >
                      <div
                        className="flex items-center"
                        style={{ paddingRight: i === 0 ? 15 : undefined }}
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((r) => {
              const selected = r.getIsSelected();
              return (
                <tr key={r.id} className="group">
                  {r.getVisibleCells().map((c, i) => {
                    const isIndex = i === 0;
                    return (
                      <td
                        key={c.id}
                        className={[
                          "border-b border-neutral-200 p-0",
                          isIndex ? "" : "border-r", // keep: no right border on first column
                          selected ? "bg-blue-50" : "bg-white",
                          isIndex
                            ? `${selected ? "bg-blue-50" : "bg-neutral-50"} text-center align-middle`
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
                          <div
                            className="flex items-center"
                            style={{ height: CELL_H }}
                          >
                            {flexRender(c.column.columnDef.cell, c.getContext())}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Full-width + row (same base color, darker on hover) */}
            <tr>
              <td
                colSpan={table.getVisibleLeafColumns().length}
                className="border-b border-r border-neutral-200 p-0"
              >
                <button
                  onClick={onAddRow}
                  type="button"
                  aria-label="Add row"
                  className="group flex w-full items-center bg-white hover:bg-neutral-50 transition-colors"
                  style={{ height: CELL_H, paddingLeft: 15 }} // keep 32px for the add-row
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
    </div>
  );
}
