"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";

/* ---------------- UI helpers ---------------- */

const SIDEBAR_W_CLASS = "pl-14";

function ToolBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded px-2 py-1 text-[12px] text-neutral-600 hover:bg-amber-100">
      {children}
    </button>
  );
}
function RailBtn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100"
      title={title}
    >
      {children}
    </button>
  );
}
/** Mask an SVG and paint it with `background-color` (for white header glyph) */
function MaskIcon({
  src,
  className = "",
  color = "white",
}: {
  src: string;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={className}
      style={{
        backgroundColor: color,
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
        display: "inline-block",
      }}
    />
  );
}

/* ---------------- Data models ---------------- */

type ColumnMeta = {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
  hidden: boolean | null;
  ordinal: number;
};
type RowRecord = {
  id: string;
  tableId: string;          // add
  createdAt: Date | string; // add (superjson will hydrate to Date)
  data: Record<string, string | number | "">;
};

function CellEditor({
  initial,
  isNumber,
  onCommit,
}: {
  initial: string | number | "";
  isNumber: boolean;
  onCommit: (val: string | number | "") => void;
}) {
  const [val, setVal] = useState<string>(String(initial ?? ""));

  // If the row was updated elsewhere, reflect it
  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial]);

  const commit = () => {
    if (isNumber) {
      if (val === "") onCommit("");
      else onCommit(Number(val));
    } else {
      onCommit(val);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      commit();
    }
  };

  return (
    <input
      className="block h-8 w-full px-2 text-[13px] outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      type={isNumber ? "number" : "text"}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}

/* ---------------- Page ---------------- */

export default function BasePage() {
  const router = useRouter();
  const { baseId } = useParams<{ baseId: string }>();
  const search = useSearchParams();
  const urlTableId = search.get("t") ?? "";

  // base header
  const { data: base, isLoading: baseLoading, error: baseErr } =
    api.base.byId.useQuery({ id: String(baseId) });

  // list tables to pick or create one automatically
  const tablesQ = api.table.list.useQuery(
    { baseId: String(baseId) },
    { enabled: !!baseId }
  );

  const createTable = api.table.create.useMutation({
    onSuccess: (t) => {
      router.replace(`/b/${String(baseId)}?t=${t.id}`);
    },
  });

  // Create a nice incremental name: Table 1, Table 2, ...
  const makeNextTableName = () => {
    const names = (tablesQ.data ?? []).map(t => t.name ?? "");
    let n = 1;
    while (names.includes(`Table ${n}`)) n++;
    return `Table ${n}`;
  };

  const switchToTable = (id: string) => {
    if (!baseId) return;
    router.replace(`/b/${String(baseId)}?t=${id}`);
  };

  const handleAddTable = () => {
    if (!baseId || createTable.isPending) return;
    createTable.mutate({ baseId: String(baseId), name: makeNextTableName() });
  };

  // Redirect to first table, or create one
  useEffect(() => {
    if (!baseId) return;
    if (urlTableId) return;

    if (tablesQ.status === "success") {
      const first = tablesQ.data?.[0];
      if (first) {
        router.replace(`/b/${String(baseId)}?t=${first.id}`);
      } else if (!createTable.isPending) {
        createTable.mutate({ baseId: String(baseId), name: "Table 1" });
      }
    }
  }, [baseId, urlTableId, tablesQ.status, tablesQ.data, router, createTable]);

  const tableId = urlTableId;

  // columns (schema)
  const {
    data: cols,
    isLoading: colsLoading,
    error: colsErr,
  } = api.table.meta.useQuery({ tableId }, { enabled: !!tableId });

  // rows (infinite)
  const rowsQ = api.row.list.useInfiniteQuery(
    { tableId, limit: 200 },
    {
      enabled: !!tableId,
      getNextPageParam: (d) => d?.nextCursor ?? undefined,
    }
  );
  const allRows: RowRecord[] = useMemo(
    () => (rowsQ.data?.pages ?? []).flatMap((p) => p.rows as RowRecord[]),
    [rowsQ.data]
  );

  // selection
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // ---- mutation: update a single cell (optimistic, commit-on-blur/enter) ----
  const utils = api.useUtils();
  const updateCell = api.row.updateCell.useMutation({
    onMutate: async (vars) => {
      await utils.row.list.cancel({ tableId, limit: 200 });
      const prev = utils.row.list.getInfiniteData({ tableId, limit: 200 });

      // optimistic cache write
      utils.row.list.setInfiniteData({ tableId, limit: 200 }, (data) => {
        if (!data) return data;
        const pages = data.pages.map((p) => {
          const rows = p.rows.map((r: any) =>
            r.id === vars.rowId
              ? { ...r, data: { ...r.data, [vars.columnId]: String(vars.value) } }
              : r
          );
          return { ...p, rows };
        });
        return { ...data, pages };
      });

      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.row.list.setInfiniteData({ tableId, limit: 200 }, ctx.prev);
    },
    // No onSettled invalidation -> avoids flicker & lag while typing
  });

  // helper: build empty row from schema
  const makeEmptyRow = () =>
    Object.fromEntries(
      ((cols as ColumnMeta[] | undefined) ?? []).map((c) => [
        c.id,
        "", // allow empty text or number; server stores string, that's fine
      ])
    ) as Record<string, string | number | "">;

  // ---- add row mutation (optimistic) ----
  const addRowMut = api.row.create.useMutation({
    onMutate: async (vars) => {
      const q = { tableId, limit: 200 as const };

      await utils.row.list.cancel(q);
      const prev = utils.row.list.getInfiniteData(q);

      const tempId = `temp-${Date.now()}`;
      const optimisticRow: RowRecord = {
        id: tempId,
        tableId,
        createdAt: new Date().toISOString(),
        data: vars.data,
      };

      // Build new cache object without using the callback overload
      const nextData =
        !prev
          ? {
              pageParams: [],
              pages: [
                {
                  rows: [optimisticRow],
                  nextCursor: undefined,
                  total: 1,
                },
              ],
            }
          : {
              ...prev,
              pages: prev.pages.map((p, i, arr) =>
                i === arr.length - 1 ? { ...p, rows: [...p.rows, optimisticRow] } : p
              ),
            };

      utils.row.list.setInfiniteData(q, nextData);
      return { prev, tempId };
    },

    onError: (_e, _v, ctx) => {
      const q = { tableId, limit: 200 as const };
      if (ctx?.prev) utils.row.list.setInfiniteData(q, ctx.prev);
    },

    // keep snappy; one invalidate after server writes the real row id
    onSettled: () => {
      const q = { tableId, limit: 200 as const };
      void utils.row.list.invalidate(q);
    },
  });

  // tanstack columns
  const columnDefs: ColumnDef<RowRecord, any>[] = useMemo(() => {
    const defs: ColumnDef<RowRecord, any>[] = [];

    // selection column
    defs.push({
      id: "__select",
      header: ({ table }) => {
        const all = table.getIsAllRowsSelected();
        const ind = table.getIsSomeRowsSelected();
        return (
          <SelectableCheckbox
            checked={all}
            indeterminate={ind}
            onChange={table.getToggleAllRowsSelectedHandler() as any}
            className="mx-auto"
          />
        );
      },
      cell: ({ row }) => (
        <SelectableCheckbox
          checked={row.getIsSelected()}
          indeterminate={row.getIsSomeSelected()}
          onChange={row.getToggleSelectedHandler() as any}
          className="mx-auto"
        />
      ),
      size: 48,
      minSize: 48,
      enableSorting: false,
      enableResizing: false,
    });

    // DB columns
    for (const c of (cols as ColumnMeta[] | undefined) ?? []) {
      if (c.hidden) continue;
      defs.push({
        id: c.id,
        header: () => (
          <div className="flex h-8 items-center gap-1.5">
            <span className="truncate text-[12px] font-medium text-neutral-700">
              {c.name}
            </span>
          </div>
        ),
        accessorFn: (row) => row.data[c.id] ?? "",
        // IMPORTANT: editable cell that commits on blur/Enter/Tab
        cell: ({ row, getValue }) => {
          const v = getValue() as string | number | "";
          const isNumber = c.type === "NUMBER";
          return (
            <CellEditor
              initial={v}
              isNumber={isNumber}
              onCommit={(finalVal) =>
                updateCell.mutate({
                  rowId: row.original.id,
                  columnId: c.id,
                  value: finalVal,
                  colType: c.type,          // <<< add this line
                })
              }
            />
          );
        },
        size: c.ordinal === 0 ? 220 : 160,
        minSize: 120,
      });
    }

    // trailing +
    defs.push({
      id: "__plus",
      header: () => null,
      cell: () => null,
      size: 40,
      minSize: 40,
      enableSorting: false,
      enableResizing: false,
    });

    return defs;
  }, [cols, updateCell]);

  const table = useReactTable({
    data: allRows,
    columns: columnDefs,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  // fetch next page on scroll-near-bottom
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!rowsQ.hasNextPage || rowsQ.isFetchingNextPage) return;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 400;
      if (nearBottom) void rowsQ.fetchNextPage();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [rowsQ.hasNextPage, rowsQ.isFetchingNextPage, rowsQ.fetchNextPage]);

  // loading / error states
  if (baseLoading || tablesQ.isLoading) {
    return <div className="p-6 text-sm">Loading…</div>;
  }
  if (baseErr) return <div className="p-6 text-red-600">Error: {baseErr.message}</div>;

  if (!urlTableId) {
    return <div className="p-6 text-sm">Preparing your first table…</div>;
  }

  if (colsLoading) return <div className="p-6 text-sm">Loading…</div>;
  if (colsErr) return <div className="p-6 text-red-600">Error: {colsErr.message}</div>;
  if (!base || !cols) return <div className="p-6">Not found.</div>;

  /* ---------------- UI (unchanged shell) ---------------- */

  return (
    <div className="relative min-h-screen bg-white text-[13px] text-neutral-700">
      {/* LEFT skinny rail */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col items-center border-r border-neutral-200 bg-white">
        <div className="mt-2">
          <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100" title="Airtable">
            <img src="/airtable.svg" alt="Airtable" className="h-5 w-5 opacity-90" />
          </button>
        </div>
        <div className="mt-4 h-3.5 w-3.5 rounded-full border border-neutral-300" />
        <div className="mt-4 flex flex-col gap-1.5">
          <RailBtn title="Home">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V9h6v12" />
            </svg>
          </RailBtn>
          <RailBtn title="Bases">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </RailBtn>
        </div>
        <div className="mt-auto mb-3">
          <button className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-[12px] font-medium text-white" title="Account">
            {base?.name?.[0]?.toUpperCase() ?? "U"}
          </button>
        </div>
      </aside>

      <div className={SIDEBAR_W_CLASS}>
        {/* Header */}
        <div className="border-b border-neutral-200 bg-white">
          <div className="flex h-12 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="rounded px-1.5 py-1 text-neutral-500 hover:bg-neutral-100" title="Back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
              <span className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: base.color ?? "#d4a257" }}>
                <MaskIcon src="/airtable.svg" color="white" className="h-3.5 w-3.5" />
              </span>
              <div className="flex items-center gap-1 text-[14px] font-semibold">
                {base.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div className="ml-6 flex items-center gap-6">
                <button className="relative text-[13px] font-medium text-neutral-900">
                  Data
                  <div className="absolute bottom-[-13px] left-0 h-[2px] w-full bg-amber-600" />
                </button>
                <button className="text-[13px] text-neutral-500 hover:text-neutral-900">Automations</button>
                <button className="text-[13px] text-neutral-500 hover:text-neutral-900">Interfaces</button>
                <button className="text-[13px] text-neutral-500 hover:text-neutral-900">Forms</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded border border-neutral-300 px-3 py-1.5 text-[13px] hover:bg-neutral-50">Launch</button>
              <button className="rounded bg-amber-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-amber-700">Share</button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-neutral-200 bg-amber-50">
          <div className="flex h-10 items-center justify-between px-4">
            {/* Left: table tabs + add */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {(tablesQ.data ?? []).map((t) => {
                const active = t.id === tableId;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchToTable(t.id)}
                    className={[
                      "whitespace-nowrap rounded px-2 py-1 text-[13px]",
                      active
                        ? "bg-amber-100 text-neutral-900 font-medium"
                        : "text-neutral-600 hover:text-neutral-900",
                    ].join(" ")}
                    title={t.name ?? "Table"}
                  >
                    {t.name ?? "Table"}
                  </button>
                );
              })}

              <div className="mx-2 h-4 w-px shrink-0 bg-neutral-300" />

              <button
                onClick={handleAddTable}
                disabled={createTable.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-[13px] text-neutral-600 hover:text-neutral-900 disabled:opacity-60"
                title="Create a new table"
                type="button"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {createTable.isPending ? "Creating…" : "Add or import"}
              </button>
            </div>

            {/* Right: other toolbar buttons (unchanged) */}
            <div className="flex items-center gap-1">
              <ToolBtn>Hide fields</ToolBtn>
              <ToolBtn>Filter</ToolBtn>
              <ToolBtn>Group</ToolBtn>
              <ToolBtn>Sort</ToolBtn>
              <ToolBtn>Color</ToolBtn>
              <ToolBtn>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </ToolBtn>
              <ToolBtn>Share and sync</ToolBtn>
              <ToolBtn>
                Tools
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </ToolBtn>
              <button className="rounded px-2 py-1 text-[12px] text-neutral-600 hover:bg-amber-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                  <circle cx="12" cy="19" r="1" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div ref={containerRef} className="overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h, i) => (
                    <th
                      key={h.id}
                      className={[
                        "sticky top-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 px-2 py-0 text-left font-normal",
                        i === 0 ? "w-12" : "",
                      ].join(" ")}
                      style={{ width: h.getSize() }}
                    >
                      <div className="flex h-8 items-center">
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((r) => (
                <tr key={r.id} className="group">
                  {r.getVisibleCells().map((c, i) => (
                    <td
                      key={c.id}
                      className={[
                        "border-b border-r border-neutral-200 bg-white p-0",
                        i === 0 ? "bg-neutral-50 text-center align-middle" : "",
                      ].join(" ")}
                      style={{ width: c.column.getSize() }}
                    >
                      {i === 0 ? (
                        <div className="flex h-8 items-center justify-center">
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </div>
                      ) : (
                        flexRender(c.column.columnDef.cell, c.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Airtable-style add row: plus only in the left gutter */}
              <tr>
                {/* left gutter with + */}
                <td className="bg-neutral-50 border-b border-r border-neutral-200 p-0 w-12">
                  <button
                    onClick={() => addRowMut.mutate({ tableId, data: makeEmptyRow() })}
                    disabled={addRowMut.isPending}
                    className="flex h-8 w-full items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-60"
                    title="Add row"
                    aria-label="Add row"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </td>
                {/* filler cells across rest of columns */}
                {table.getVisibleLeafColumns().slice(1).map((col) => (
                  <td
                    key={`stub-${col.id}`}
                    className="border-b border-r border-neutral-200 p-0 bg-white"
                    style={{ width: col.getSize() }}
                  />
                ))}
              </tr>
            </tbody>
          </table>

          {rowsQ.isFetchingNextPage && (
            <div className="p-3 text-center text-[12px] text-neutral-500">
              Loading more…
            </div>
          )}
        </div>

        {/* Bottom-left count */}
        <div className="fixed bottom-4 left-20 flex items-center gap-2">
          <span className="ml-2 text-[12px] text-neutral-500">
            {table.getRowModel().rows.length} records
          </span>
        </div>
      </div>
    </div>
  );
}

/* Pretty checkbox with indeterminate */
function SelectableCheckbox({
  checked,
  indeterminate,
  onChange,
  className = "",
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={`inline-flex items-center ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white ring-1 ring-neutral-300 peer-checked:bg-[#4663ff] peer-checked:ring-[#4663ff]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          className="opacity-0 peer-checked:opacity-100 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          className={`${indeterminate && !checked ? "opacity-100" : "opacity-0"} absolute text-white`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
    </label>
  );
}

/* --------- NEW: commit-on-blur editor to fix one-letter typing --------- */
function EditableCell({
  rowId,
  columnId,
  colType,
  initial,
  commit,
}: {
  rowId: string;
  columnId: string;
  colType: "TEXT" | "NUMBER";
  initial: string | number | "";
  commit: (args: {
    rowId: string;
    columnId: string;
    value: string | number | "";
    colType: "TEXT" | "NUMBER";
  }) => void;
}) {
  const [val, setVal] = useState<string>(String(initial ?? ""));

  // keep in sync if data is refreshed externally
  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial, rowId, columnId]);

  const doCommit = () => {
    commit({ rowId, columnId, value: val, colType });
  };

  return (
    <input
      className="block h-8 w-full px-2 text-[13px] outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      type="text" // keep text to allow "" and partial numbers while editing
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={doCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Tab") doCommit();
      }}
    />
  );
}
