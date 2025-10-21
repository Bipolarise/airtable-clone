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
  tableId: string;
  createdAt: Date | string;
  data: Record<string, string | number | "">;
};

/* ---------------- Editable input ---------------- */

function CellEditor({
  initial,
  isNumber,
  onCommit,
  onMove,         // new
  inputRefCb,     // new
}: {
  initial: string | number | "";
  isNumber: boolean;
  onCommit: (val: string | number | "") => void;
  onMove?: (dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab") => void;
  inputRefCb?: (el: HTMLInputElement | null) => void;
}) {
  const [val, setVal] = useState<string>(String(initial ?? ""));

  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial]);

  const commit = () => {
    const next = isNumber ? (val === "" ? "" : Number(val)) : val;
    // no-op if value didn't change → prevents unnecessary re-renders that can steal focus
    if (String(next) === String(initial ?? "")) return;
    onCommit(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      commit();
      onMove?.(e.shiftKey ? "shiftTab" : "tab");
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      commit();
      onMove?.("left");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      commit();
      onMove?.("right");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      commit();
      onMove?.("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      commit();
      onMove?.("down");
      return;
    }
    if (e.key === "Enter") {
      commit();
    }
  };

  return (
    <input
      ref={inputRefCb}
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

  const utils = api.useUtils();

  const createTable = api.table.create.useMutation({
    onMutate: async (vars) => {
      const q = { baseId: String(baseId) } as const;

      await utils.table.list.cancel(q);
      const prev = utils.table.list.getData(q);

      const tempId = `temp-${Date.now()}`;
      const temp = {
        id: tempId,
        name: vars.name,
        icon: null as string | null,
        color: null as string | null,
        updatedAt: new Date(),
      };

      utils.table.list.setData(q, (old) => ([...(old ?? []), temp]));
      return { prev, q, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.table.list.setData(ctx.q, ctx.prev);
    },
    onSuccess: (real, _vars, ctx) => {
      if (ctx) {
        utils.table.list.setData(ctx.q, (old) =>
          (old ?? []).map((t) => (t.id === ctx.tempId ? real : t))
        );
      }
      if (baseId) router.replace(`/b/${String(baseId)}?t=${real.id}`);
    },
    onSettled: (_res, _err, _vars, ctx) => {
      if (ctx) void utils.table.list.invalidate(ctx.q);
    },
  });

  // Create a nice incremental name
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

  // ORDER of editable columns (skip the select/plus columns)
  const editableColIds = useMemo(
    () => ((cols as ColumnMeta[] | undefined) ?? [])
      .filter(c => !c.hidden)
      .map(c => c.id),
    [cols]
  );
  const colIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    editableColIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [editableColIds]);

  // a tiny ref registry: `${rowId}:${colId}` -> input element
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const setCellRef = (rowId: string, colId: string) => (el: HTMLInputElement | null) => {
    cellRefs.current[`${rowId}:${colId}`] = el;
  };

  // queue where we WANT focus to go next (arrow keys or mouse)
  const pendingFocus = useRef<{ rowIndex: number; colIndex: number } | null>(null);

  // resilient focus (retry after paint until input is mounted)
  const focusCell = (rowIndex: number, colIndex: number) => {
    const tryFocus = () => {
      const r = table.getRowModel().rows[rowIndex];
      const cId = editableColIds[colIndex];
      if (!r || !cId) return;
      const el = cellRefs.current[`${r.original.id}:${cId}`];
      if (el) {
        (el as HTMLInputElement).focus({ preventScroll: true } as any);
        (el as HTMLInputElement).select();
      } else {
        requestAnimationFrame(tryFocus);
      }
    };
    // wait at least a frame for React to commit
    requestAnimationFrame(() => requestAnimationFrame(tryFocus));
  };

  // ---- mutation: update a single cell (optimistic, commit-on-blur/enter) ----
  const updateCell = api.row.updateCell.useMutation({
    onMutate: async (vars) => {
      await utils.row.list.cancel({ tableId, limit: 200 });
      const prev = utils.row.list.getInfiniteData({ tableId, limit: 200 });

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
  });

  // after edits finish or data changes, apply queued focus
  useEffect(() => {
    if (!updateCell.isPending && pendingFocus.current) {
      const { rowIndex, colIndex } = pendingFocus.current;
      pendingFocus.current = null;
      focusCell(rowIndex, colIndex);
    }
  }, [updateCell.isPending, rowsQ.data]); // rowsQ.data covers optimistic page changes too

  // helper: build empty row from schema
  const makeEmptyRow = () =>
    Object.fromEntries(
      ((cols as ColumnMeta[] | undefined) ?? []).map((c) => [
        c.id,
        "",
      ])
    ) as Record<string, string | number | "">;

  // ---- add row mutation (optimistic) ----
  const addRowMut = api.row.create.useMutation({
    onMutate: async (vars) => {
      const q = { tableId, limit: 200 } as const;

      await utils.row.list.cancel(q);
      const prev = utils.row.list.getInfiniteData(q);

      const tempId = `temp-${Date.now()}`;

      utils.row.list.setInfiniteData(q, (old) => {
        const optimisticRow = {
          id: tempId,
          tableId,
          createdAt: new Date(),
          data: vars.data,
        } as any;

        if (!old || old.pages.length === 0) {
          return {
            pageParams: [],
            pages: [
              {
                rows: [optimisticRow],
                nextCursor: undefined,
                total: 1,
              },
            ],
          } as any;
        }

        const pages = old.pages.map((p, i, arr) =>
          i === arr.length - 1
            ? ({ ...p, rows: [...p.rows, optimisticRow] } as any)
            : p
        );

        return { ...old, pages } as any;
      });

      return { prev, q };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.q) utils.row.list.setInfiniteData(ctx.q, ctx.prev);
    },

    onSettled: (_r, _e, _v, ctx) => {
      if (ctx?.q) void utils.row.list.invalidate(ctx.q);
    },
  });

  // tanstack columns
  const columnDefs: ColumnDef<RowRecord, any>[] = useMemo(() => {
    const defs: ColumnDef<RowRecord, any>[] = [];

    // selection column
    defs.push({
      id: "__select",
      size: 48,
      minSize: 48,
      enableSorting: false,
      enableResizing: false,

      header: ({ table }) => {
        const all = table.getIsAllRowsSelected(); // only care if ALL are selected

        const headerCheckboxClass =
          "absolute transition-opacity " +
          (all ? "opacity-100" : "opacity-0 group-hover:opacity-100");

        return (
          <div className="relative flex h-8 w-full items-center justify-center">
            {/* placeholder empty box (only visible when NOT all selected) */}
            <span
              aria-hidden
              className={
                "inline-flex h-5 w-5 items-center justify-center rounded bg-white ring-1 ring-neutral-300 " +
                (all ? "hidden" : "group-hover:hidden")
              }
            />
            {/* real checkbox; never show indeterminate in the header */}
            <SelectableCheckbox
              checked={all}
              indeterminate={false}
              onChange={table.getToggleAllRowsSelectedHandler() as any}
              className={headerCheckboxClass}
            />
          </div>
        );
      },

      cell: ({ row }) => {
        const selected = row.getIsSelected();
        const cellCheckboxClass =
          "absolute transition-opacity " +
          (selected ? "opacity-100" : "opacity-0 group-hover:opacity-100");

        return (
          <div className="relative flex h-8 w-full items-center justify-center">
            <span
              className={
                "pointer-events-none text-xs tabular-nums text-neutral-500 " +
                (selected ? "hidden" : "group-hover:hidden")
              }
            >
              {row.index + 1}
            </span>

            <SelectableCheckbox
              checked={selected}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler() as any}
              className={cellCheckboxClass}
            />
          </div>
        );
      },
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
        cell: ({ row, getValue, column }) => {
          const v = getValue() as string | number | "";
          const isNumber = c.type === "NUMBER";

          const curRowIndex = row.index;
          const curColIndex = colIndexMap.get(column.id) ?? 0;
          const lastCol = editableColIds.length - 1;

          const move = (dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab") => {
            let r = curRowIndex;
            let col = curColIndex;

            switch (dir) {
              case "left":     col = Math.max(0, col - 1); break;
              case "right":    col = Math.min(lastCol, col + 1); break;
              case "up":       r = Math.max(0, r - 1); break;
              case "down":     r = Math.min(table.getRowModel().rows.length - 1, r + 1); break;
              case "tab":
                if (col < lastCol) col++;
                else { col = 0; r = Math.min(table.getRowModel().rows.length - 1, r + 1); }
                break;
              case "shiftTab":
                if (col > 0) col--;
                else { col = lastCol; r = Math.max(0, r - 1); }
                break;
            }
            pendingFocus.current = { rowIndex: r, colIndex: col };
            // also try to focus immediately (with retry) — covers cases with no mutation
            focusCell(r, col);
          };

          return (
            <div
              className="h-8"
              onMouseDown={(e) => {
                // record destination first, then prevent fragile native focus
                pendingFocus.current = { rowIndex: curRowIndex, colIndex: curColIndex };
                e.preventDefault();
                // attempt immediate focus; if edit triggers a rerender, our effect will re-apply
                focusCell(curRowIndex, curColIndex);
              }}
            >
              <CellEditor
                initial={v}
                isNumber={isNumber}
                onCommit={(finalVal) =>
                  updateCell.mutate({
                    rowId: row.original.id,
                    columnId: c.id,
                    value: finalVal,
                    colType: c.type,
                  })
                }
                onMove={move}
                inputRefCb={setCellRef(row.original.id, c.id)}
              />
            </div>
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
  }, [cols, updateCell, colIndexMap, editableColIds]);

  const table = useReactTable({
    data: allRows,
    columns: columnDefs,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const allSelected  = table.getIsAllRowsSelected();
  const someSelected = table.getIsSomeRowsSelected();

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

  /* ---------------- UI ---------------- */

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

            {/* Right: other toolbar buttons */}
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
                <tr key={hg.id} className="group">
                  {hg.headers.map((h, i) => (
                    <th
                      key={h.id}
                      className={[
                        "sticky top-0 z-10 border-b border-r border-neutral-200 px-2 py-0 text-left font-normal",
                        allSelected ? "bg-blue-50" : "bg-neutral-50",
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
              {table.getRowModel().rows.map((r) => {
                const selected = r.getIsSelected();
                return (
                  <tr key={r.id} className="group">
                    {r.getVisibleCells().map((c, i) => {
                      return (
                        <td
                          key={c.id}
                          className={[
                            "border-b border-r border-neutral-200 p-0",
                            selected ? "bg-blue-50" : "bg-white",
                            i === 0
                              ? (selected ? "bg-blue-50" : "bg-neutral-50") +
                                " text-center align-middle"
                              : "",
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
                      );
                    })}
                  </tr>
                );
              })}

              {/* Airtable-style add row: plus only in the left gutter */}
              <tr>
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
                {table.getVisibleLeafColumns().slice(1).map((col) => {
                  return (
                    <td
                      key={`stub-${col.id}`}
                      className="border-b border-r border-neutral-200 p-0 bg-white"
                      style={{ width: col.getSize() }}
                    />
                  );
                })}
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
/* Airtable-style checkbox (matches size/colors/hover/focus) */
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

  const base =
    "relative inline-flex h-5 w-5 items-center justify-center rounded-[4px] transition-colors " +
    "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)] outline-none " +
    "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#166EE1] focus-within:ring-offset-white";

  const on  = "bg-[#166EE1] ring-1 ring-[#166EE1] hover:bg-[#166EE1]";
  const off = "bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 hover:ring-neutral-400";

  return (
    <label className={["inline-flex items-center justify-center", className].join(" ")}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={[base, checked || indeterminate ? on : off].join(" ")}>
        {/* checkmark */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className={checked && !indeterminate ? "opacity-100" : "opacity-0"}
          style={{ transition: "opacity 120ms" }}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {/* indeterminate bar */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className={indeterminate && !checked ? "opacity-100 absolute" : "opacity-0 absolute"}
          style={{ transition: "opacity 120ms" }}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
    </label>
  );
}

/* (Unused now) Older EditableCell kept for reference; can be removed */
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
  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial, rowId, columnId]);
  const doCommit = () => {
    commit({ rowId, columnId, value: val, colType });
  };
  return (
    <input
      className="block h-8 w-full px-2 text-[13px] outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={doCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Tab") doCommit();
      }}
    />
  );
}
