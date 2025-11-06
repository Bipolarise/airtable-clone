// src/app/b/[baseId]/page.tsx
"use client";

import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import SelectableCheckbox from "~/app/_components/SelectableCheckbox";
import CellEditor from "~/app/_components/CellEditor";
import LeftRail from "~/app/_components/LeftRail";
import BaseHeaderToolbar from "~/app/_components/BaseHeaderToolbar";
import DataGrid from "~/app/_components/DataGrid";
import ViewHeaderBar from "~/app/_components/ViewHeaderBar";
import SearchResultsModal from "~/app/_components/SearchResultsModal";
import ViewsPanel, { type ViewItem } from "~/app/_components/ViewsPanel";
import "~/styles/globals.css";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import { useViewHiddenFields } from "~/app/_logic/useViewHiddenFields";

import type { Condition } from "~/app/_components/ViewHeaderBar";
import HideFieldsModal from "~/app/_components/HideFieldsModal";

/* ---------------- layout constants ---------------- */
const BASE_RAIL_W = 56;
const VIEWS_PANEL_W = 260;

const HILITE = "#FFF6D1";
const ACTIVE_HILITE = "#F7D563";

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

/* ---------------- Page ---------------- */
export default function BasePage() {
  const router = useRouter();
  const { baseId } = useParams<{ baseId: string }>();
  const searchParams = useSearchParams();
  const urlTableId = searchParams.get("t") ?? "";
  const utils = api.useUtils();

  // -------- Views (left side panel) --------
  const [viewsOpen, setViewsOpen] = useState(false);

  // ---- Views (per-table saved views) ----
  const urlViewId = searchParams.get("v") || null;
  const [activeViewId, setActiveViewId] = useState<string | null>(urlViewId);

  // -------- tables / base --------
  const [activeTableId, setActiveTableId] = useState<string>(urlTableId);
  useEffect(() => {
    setActiveTableId((prev) => (prev ? prev : urlTableId));
  }, [urlTableId]);
  const tableId = activeTableId;

  // SERVER VIEWS
  const viewsQ = api.view.listByTable.useQuery(
    { tableId: String(tableId || "") },
    { enabled: !!tableId }
  );

  // Always put "Grid view" first if it exists
  const views: ViewItem[] = useMemo(() => {
    const vs = (viewsQ.data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      type: "grid" as const,
    }));
    vs.sort((a, b) => {
      const aIsDefault = a.name === "Grid view" ? 1 : 0;
      const bIsDefault = b.name === "Grid view" ? 1 : 0;
      return bIsDefault - aIsDefault; // default first
    });
    return vs;
  }, [viewsQ.data]);

  const activeViewName = useMemo(
    () => views.find((v) => v.id === activeViewId)?.name ?? "Grid view",
    [views, activeViewId]
  );

  // create view on the server
  const createView = api.view.save.useMutation({
    onSuccess: async (created) => {
      await utils.view.listByTable.invalidate({ tableId: String(tableId || "") });
      setActiveViewId(created.id);

      if (baseId && tableId) {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.set("t", tableId);
        params.set("v", created.id);
        router.replace(`/b/${String(baseId)}?${params.toString()}`);
      }
    },
  });

  // If the table has no views yet, create the default "Grid view"
  useEffect(() => {
    if (!tableId) return;
    if (viewsQ.isLoading || createView.isPending) return;
    if ((viewsQ.data?.length ?? 0) === 0) {
      createView.mutate({ tableId: String(tableId), name: "Grid view" });
    }
  }, [tableId, viewsQ.isLoading, viewsQ.data, createView]);

  // hook to add a new view
  const addView = useCallback(() => {
    if (!tableId || createView.isPending) return;
    const n = (views.filter((v) => v.type === "grid").length || 0) + 1;
    createView.mutate({
      tableId: String(tableId),
      name: `Grid view ${n}`,
    });
  }, [tableId, createView.isPending, createView, views]);

  /* ---------------- search state ---------------- */
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(id);
  }, [searchText]);

  /* ---------------- filters ---------------- */
  const [filterConditions, setFilterConditions] = useState<Condition[]>([]);
  const highlightedCols = useMemo(() => {
    const needsValue = (op: Condition["op"]) => op !== "empty" && op !== "not_empty";
    const s = new Set<string>();
    for (const c of filterConditions) {
      if (!c.fieldId) continue;
      if (needsValue(c.op) && String(c.value ?? "").trim() === "") continue;
      s.add(c.fieldId);
    }
    return s;
  }, [filterConditions]);

  /* ---------------- bulkAdd 100k rows mutation ---------------- */
  const bulkAdd = api.row.bulkAddDemo.useMutation({
    onSuccess: () => {
      void utils.row.list.invalidate({
        tableId,
        limit: 200,
        search: debouncedSearch,
        conditions: filterConditions,
      });
    },
  });

  /* ---------------- Base + tables ---------------- */
  const { data: base, isLoading: baseLoading, error: baseErr } =
    api.base.byId.useQuery({ id: String(baseId) });

  const tablesQ = api.table.list.useQuery(
    { baseId: String(baseId) },
    { enabled: !!baseId }
  );

  const prefetchTable = useCallback(
    async (id: string, search = "") => {
      const qRows = { tableId: id, limit: 200, search, conditions: [] as Condition[] };
      await Promise.all([
        utils.table.meta.prefetch({ tableId: id }),
        utils.row.list.prefetchInfinite(qRows),
      ]);
    },
    [utils]
  );

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

      utils.table.list.setData(q, (old) => [...(old ?? []), temp]);
      return { prev, q, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.table.list.setData(ctx.q, ctx.prev);
    },
    onSuccess: async (real, _vars, ctx) => {
      if (ctx) {
        utils.table.list.setData(ctx.q, (old) =>
          (old ?? []).map((t) => (t.id === ctx.tempId ? real : t))
        );
      }
      await prefetchTable(real.id, debouncedSearch);
      startTransition(() => {
        setActiveTableId(real.id);
        if (baseId) router.replace(`/b/${String(baseId)}?t=${real.id}`);
      });
    },
    onSettled: (_res, _err, _vars, ctx) => {
      if (ctx) void utils.table.list.invalidate(ctx.q);
    },
  });

  const makeNextTableName = () => {
    const names = (tablesQ.data ?? []).map((t) => t.name ?? "");
    let n = 1;
    while (names.includes(`Table ${n}`)) n++;
    return `Table ${n}`;
  };

  // <<<<<< INSTANT SWITCH + EMPTY LOADING STATE >>>>>>
  const switchToTable = useCallback(
    (id: string) => {
      if (!baseId || id === activeTableId) return;

      // 1) Switch UI + URL immediately
      startTransition(() => {
        setActiveTableId(id);
        setActiveViewId(null); // avoid stale per-table view state
        router.replace(`/b/${String(baseId)}?t=${id}`);
      });

      // 2) Warm the data without blocking the UI
      void prefetchTable(id, debouncedSearch);
    },
    [baseId, activeTableId, router, prefetchTable, debouncedSearch]
  );

  useEffect(() => {
    if (!baseId) return;
    if (activeTableId) return;

    if (tablesQ.status === "success") {
      const first = tablesQ.data?.[0];
      if (first) {
        (async () => {
          await prefetchTable(first.id, debouncedSearch);
          startTransition(() => {
            setActiveTableId(first.id);
            router.replace(`/b/${String(baseId)}?t=${first.id}`);
          });
        })();
      } else if (!createTable.isPending) {
        createTable.mutate({ baseId: String(baseId), name: "Table 1" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId, tablesQ.status, tablesQ.data, createTable.isPending]);

  // Reset active view when table changes
  useEffect(() => {
    setActiveViewId(null);
  }, [tableId]);

  // Pick a default active view once views load (prefer "Grid view")
  useEffect(() => {
    if (activeViewId) return;
    const first =
      views.find((v) => v.name === "Grid view") ?? // prefer the default
      views[0];

    if (!first) return;

    setActiveViewId(first.id);

    if (baseId && tableId) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("t", tableId);
      params.set("v", first.id);
      router.replace(`/b/${String(baseId)}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, activeViewId, baseId, tableId]);

  /* ---------------- Columns + rows ---------------- */
  const {
    data: colsFromServer,
    isLoading: colsLoading,
    error: colsErr,
  } = api.table.meta.useQuery({ tableId }, { enabled: !!tableId });

  const [localCols, setLocalCols] = useState<ColumnMeta[] | null>(null);

  useEffect(() => {
    setLocalCols(null);
  }, [tableId]);

  const unifiedCols: ColumnMeta[] = useMemo(() => {
    return (localCols ?? (colsFromServer as ColumnMeta[] | undefined) ?? [])
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal);
  }, [localCols, colsFromServer]);

  // Per-view hidden overlay
  const {
    effectiveCols: viewCols,
    setHidden,
    hideAll,
    showAll,
    hiddenSet,
  } = useViewHiddenFields(unifiedCols, tableId, activeViewId);

  // For the standalone HideFieldsModal (outside the header)
  const toggleHidden = useCallback(
    (id: string) => {
      const curHidden = !!viewCols.find((c) => c.id === id)?.hidden;
      setHidden(id, !curHidden);
    },
    [setHidden, viewCols]
  );

  // Only set diffs coming from child -> parent (prevents loops)
  const onHeaderHiddenChange = useCallback(
    (m: Record<string, boolean>) => {
      let changed = false;
      for (const c of unifiedCols) {
        const nextHidden = !!m[c.id];
        const curHidden = hiddenSet.has(c.id);
        if (nextHidden !== curHidden) {
          setHidden(c.id, nextHidden);
          changed = true;
        }
      }
      if (!changed) return;
    },
    [unifiedCols, hiddenSet, setHidden]
  );

  // --- Stable "seed" for ViewHeaderBar: updates only when actual hidden values change
  const hiddenSignature = useMemo(() => {
    const ids = unifiedCols.map((c) => c.id);
    return ids.map((id) => (hiddenSet.has(id) ? "1" : "0") + ":" + id).join("|");
  }, [unifiedCols, hiddenSet]);

  const seedHiddenMap = useMemo(
    () => Object.fromEntries(unifiedCols.map((c) => [c.id, hiddenSet.has(c.id)])),
    [hiddenSignature]
  );

  type FieldOptionForModal = { id: string; label: string; type: "TEXT" | "NUMBER" };

  const fieldOptionsForModal: FieldOptionForModal[] = useMemo(
    () =>
      viewCols
        .filter((c) => !c.hidden)
        .map((c) => ({ id: c.id, label: c.name, type: c.type } as const)),
    [viewCols]
  );

  // rows (infinite w/ cursor)
  const rowsQ = api.row.list.useInfiniteQuery(
    { tableId, limit: 200, search: debouncedSearch, conditions: filterConditions },
    {
      enabled: !!tableId,
      getNextPageParam: (d) => d?.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    }
  );

  const allRows: RowRecord[] = useMemo(
    () => (rowsQ.data?.pages ?? []).flatMap((p) => p.rows as RowRecord[]),
    [rowsQ.data]
  );

  // No extra client filtering during scroll; use server result
  const filteredRows: RowRecord[] = allRows;

  // Only compute highlighting when Find modal is open
  const [showModal, setShowModal] = useState(false);
  const textColIds = useMemo(() => {
    if (!showModal) return [];
    return viewCols.filter((c) => c.type === "TEXT" && !c.hidden).map((c) => c.id);
  }, [viewCols, showModal]);
  const normSearch = showModal ? debouncedSearch.trim().toLowerCase() : "";

  const matches = useMemo(() => {
    if (!showModal) return [];
    const out: { rowId: string; colId: string; rowIndex: number; colIndex: number }[] = [];
    if (!normSearch) return out;
    filteredRows.forEach((r, rIdx) => {
      textColIds.forEach((cid) => {
        const v = r.data[cid];
        if (typeof v === "string" && v.toLowerCase().includes(normSearch)) {
          out.push({
            rowId: r.id,
            colId: cid,
            rowIndex: rIdx,
            colIndex: 0,
          });
        }
      });
    });
    return out;
  }, [filteredRows, textColIds, normSearch, showModal]);

  const totalRecords = useMemo(() => {
    const firstPage = rowsQ.data?.pages?.[0];
    if (!firstPage) return 0;
    return (firstPage as any).total ?? allRows.length;
  }, [rowsQ.data, allRows.length]);

  /* ---------------- selection + focus ---------------- */
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);
  const [suppressFocusKey, setSuppressFocusKey] = useState<string | null>(null);
  const suppressSelectNextFocusRef = useRef(false);

  /* ---------------- grid helpers ---------------- */
  const editableColIds = useMemo(
    () => viewCols.filter((c) => !c.hidden).map((c) => c.id),
    [viewCols]
  );

  const colIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    editableColIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [editableColIds]);

  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const setCellRef = useCallback(
    (rowId: string, colId: string) => (el: HTMLInputElement | null) => {
      cellRefs.current[`${rowId}:${colId}`] = el;
    },
    []
  );

  const tableRef = useRef<ReturnType<typeof useReactTable<RowRecord>> | null>(null);

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const r = table.getRowModel().rows[rowIndex];
      const cId = editableColIds[colIndex];
      if (!r || !cId) return;

      const cellKey = `${r.original.id}:${cId}`;
      setFocusedCellKey(cellKey);

      const tryFocus = (el: HTMLInputElement) => {
        el.focus({ preventScroll: true } as any);
        if (!suppressSelectNextFocusRef.current) el.select();
        suppressSelectNextFocusRef.current = false;
      };

      const el = cellRefs.current[cellKey];
      if (!el) {
        requestAnimationFrame(() => {
          const el2 = cellRefs.current[cellKey];
          if (el2) tryFocus(el2);
        });
        return;
      }

      tryFocus(el);

      [50, 100, 150, 200, 250, 300, 400, 500].forEach((delay) => {
        setTimeout(() => {
          const freshEl = cellRefs.current[cellKey];
          if (!freshEl) return;
          const isFocused = document.activeElement === freshEl;
          if (!isFocused && document.body.contains(freshEl)) {
            try {
              freshEl.focus({ preventScroll: true } as any);
            } catch {}
          }
        }, delay);
      });
    },
    [editableColIds]
  );

  /* ---------------- mutations ---------------- */
  const lastCommittedRef = useRef<Record<string, string | number | "">>({});
  type PendingCommit = {
    rowId: string;
    columnId: string;
    colType: "TEXT" | "NUMBER";
    value: string | number | "";
  };
  const pendingQueueRef = useRef<PendingCommit[]>([]);
  const [flushTick, setFlushTick] = useState(0);

  const updateCell = api.row.updateCell.useMutation({
    onMutate: async (vars) => {
      const q = { tableId, limit: 200, search: debouncedSearch, conditions: filterConditions } as const;

      await utils.row.list.cancel(q);
      const prev = utils.row.list.getInfiniteData(q);

      utils.row.list.setInfiniteData(q, (data) => {
        if (!data) return data;

        const pages = data.pages.map((p) => {
          const rows = p.rows.map((r: any) => {
            if (r.id !== vars.rowId) return r;

            const oldVal = r.data?.[vars.columnId];
            const newVal = String(vars.value);
            if (String(oldVal ?? "") === newVal) return r;

            return { ...r, data: { ...r.data, [vars.columnId]: newVal } };
          });
          return { ...p, rows };
        });

        return { ...data, pages };
      });

      return { prev, q };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) {
        utils.row.list.setInfiniteData(ctx.q, ctx.prev);
      }
    },
  });

  const scheduleCommit = useCallback(
    (rowId: string, columnId: string, colType: "TEXT" | "NUMBER", value: string | number | "") => {
      const cellKey = rowId + ":" + columnId;
      if (String(lastCommittedRef.current[cellKey] ?? "") === String(value ?? "")) return;

      const alreadyQueued = pendingQueueRef.current.some(
        (c) =>
          c.rowId === rowId &&
          c.columnId === columnId &&
          String(c.value ?? "") === String(value ?? "")
      );
      if (alreadyQueued) return;

      pendingQueueRef.current.push({ rowId, columnId, colType, value });
      setFlushTick((x) => x + 1);
    },
    []
  );

  useEffect(() => {
    if (pendingQueueRef.current.length === 0) return;

    const flushAll = () => {
      if (pendingQueueRef.current.length === 0) return;
      const commitsToSend = pendingQueueRef.current;
      pendingQueueRef.current = [];

      for (const commit of commitsToSend) {
        const { rowId, columnId, colType, value } = commit;
        const cellKey = rowId + ":" + columnId;
        lastCommittedRef.current[cellKey] = value;
        updateCell.mutate({ rowId, columnId, value, colType });
      }
    };

    const active = document.activeElement;
    const isCellInput =
      active && active.tagName === "INPUT" && (active as HTMLInputElement).type !== "checkbox";

    if (isCellInput) {
      flushAll();
    } else {
      requestAnimationFrame(() => flushAll());
    }
  }, [flushTick, updateCell]);

  /* ---------------- row.create mutation ---------------- */
  const makeEmptyRow = () =>
    Object.fromEntries(unifiedCols.map((c) => [c.id, ""])) as Record<string, string | number | "">;

  const addRowMut = api.row.create.useMutation({
    onMutate: async (vars) => {
      const q = { tableId, limit: 200, search: debouncedSearch, conditions: filterConditions } as const;

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
            pages: [{ rows: [optimisticRow], nextCursor: undefined, total: 1 }],
          } as any;
        }

        const pages = old.pages.map((p, i, arr) =>
          i === arr.length - 1 ? { ...p, rows: [...p.rows, optimisticRow] } : p
        );

        return { ...old, pages } as any;
      });

      return { prev, q, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev && ctx.q) {
        utils.row.list.setInfiniteData(ctx.q, ctx.prev);
      }
    },
    onSuccess: (realRow, _vars, ctx) => {
      if (!ctx) return;

      utils.row.list.setInfiniteData(ctx.q, (old) => {
        if (!old) return old;

        const pages = old.pages.map((p) => ({
          ...p,
          rows: p.rows.map((r: any) =>
            r.id === ctx.tempId
              ? { ...r, id: realRow.id, createdAt: realRow.createdAt, data: r.data }
              : r
          ),
        }));

        return { ...old, pages };
      });
    },
  });

  /* ---------------- column.create mutation ---------------- */
  const makeNextTextFieldName = () => {
    const names = unifiedCols.map((c) => c.name);
    let n = 1;
    while (names.includes(`Field ${n}`)) n++;
    return `Field ${n}`;
  };

  const createColumn = api.column.create.useMutation({
    onMutate: async (vars) => {
      const maxOrdinal = unifiedCols.reduce((acc, c) => (c.ordinal > acc ? c.ordinal : acc), -1);
      const nextOrdinal = maxOrdinal + 1;

      const tempId = `temp-col-${Date.now()}`;

      setLocalCols((prev) => {
        const baseCols = prev ?? (colsFromServer as ColumnMeta[] | undefined) ?? [];
        const optimisticCol: ColumnMeta = {
          id: tempId,
          name: vars.name,
          type: (vars.type ?? "TEXT") as "TEXT" | "NUMBER",
          hidden: false,
          ordinal: nextOrdinal,
        };
        return [...baseCols, optimisticCol];
      });

      return { tempId };
    },
    onError: () => {
      void utils.table.meta.invalidate({ tableId });
    },
    onSuccess: (real, _vars, ctx) => {
      setLocalCols((prev) => {
        const baseCols = prev ?? (colsFromServer as ColumnMeta[] | undefined) ?? [];
        return baseCols.map((c) =>
          c.id === ctx?.tempId
            ? {
                id: real.id,
                name: real.name,
                type: real.type as "TEXT" | "NUMBER",
                hidden: real.hidden ?? false,
                ordinal: real.ordinal,
              }
            : c
        );
      });
    },
    onSettled: () => {
      void utils.table.meta.invalidate({ tableId });
    },
  });

  const handleAddTextColumn = () => {
    if (!tableId || createColumn.isPending) return;
    createColumn.mutate({ tableId, name: makeNextTextFieldName(), type: "TEXT" });
  };
  const handleAddNumberColumn = () => {
    if (!tableId || createColumn.isPending) return;
    createColumn.mutate({ tableId, name: "Number", type: "NUMBER" });
  };

  /* ---------------- ColumnDefs ---------------- */
  const columnDefs: ColumnDef<RowRecord, any>[] = useMemo(() => {
    const defs: ColumnDef<RowRecord, any>[] = [];

    defs.push({
      id: "__select",
      size: 48,
      minSize: 48,
      enableSorting: false,
      enableResizing: false,
      header: ({ table }) => {
        const all = table.getIsAllRowsSelected();
        const headerCheckboxClass =
          "absolute transition-opacity " +
          (all ? "opacity-100" : "opacity-0 group-hover:opacity-100");

        return (
          <div className="relative flex h-8 w-full items-center justify-center">
            <span
              aria-hidden
              className={
                "inline-flex h-5 w-5 items-center justify-center rounded bg-white ring-1 ring-neutral-300 " +
                (all ? "hidden" : "group-hover:hidden")
              }
            />
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

    for (const c of viewCols) {
      if (c.hidden) continue;

      const colIsFiltered = highlightedCols.has(c.id);

      defs.push({
        id: c.id,
        header: () => {
          const headerIcon = (() => {
            switch (c.name) {
              case "Name":
                return (
                  <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.44187 3.26606C8.35522 3.10237 8.18518 3 7.99998 3C7.81477 3 7.64474 3.10237 7.55808 3.26606L3.05808 11.7661C2.92888 12.0101 3.02198 12.3127 3.26603 12.4419C3.51009 12.5711 3.81267 12.478 3.94187 12.2339L5.12455 10H10.8754L12.0581 12.2339C12.1873 12.478 12.4899 12.5711 12.7339 12.4419C12.978 12.3127 13.0711 12.0101 12.9419 11.7661L8.44187 3.26606ZM10.346 9L7.99998 4.56863L5.65396 9H10.346Z"
                    />
                  </svg>
                );
              case "Notes":
                return (
                  <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="nonzero"
                      d="M4.24999 3C4.43937 3 4.6125 3.107 4.6972 3.27639L6.4472 6.77639C6.5707 7.02338 6.47058 7.32372 6.22359 7.44721C5.9766 7.57071 5.67627 7.4706 5.55277 7.22361L5.17327 6.4646H3.3267L2.9472 7.22361C2.82371 7.4706 2.52337 7.57071 2.27638 7.44721C2.02939 7.32372 1.92928 7.02338 2.05277 6.77639L3.80277 3.27639C3.88747 3.107 4.0606 3 4.24999 3ZM3.8267 5.4646H4.67327L4.24999 4.61803L3.8267 5.4646Z M7.5 3.75C7.22386 3.75 7 3.97386 7 4.25C7 4.52614 7.22386 4.75 7.5 4.75H13.5C13.7761 4.75 14 4.52614 14 4.25C14 3.97386 13.7761 3.75 13.5 3.75H7.5Z M8 6.75C8 6.47386 8.22386 6.25 8.5 6.25H11.5C11.7761 6.25 12 6.47386 12 6.75C12 7.02614 11.7761 7.25 11.5 7.25H8.5C8.22386 7.25 8 7.02614 8 6.75Z M2 9.25C2 8.97386 2.22386 8.75 2.5 8.75H13.5C13.7761 8.75 14 8.97386 14 9.25C14 9.52614 13.7761 10.25 13.5 10.25H2.5C2.22386 10.25 2 9.97386 2 9.25Z M2 11.75C2 11.4739 2.22386 11.25 2.5 11.25H11.5C11.7761 11.25 12 11.4739 12 11.75C12 12.0261 11.7761 12.25 11.5 12.25H2.5C2.22386 12.25 2 12.0261 2 11.75Z"
                    />
                  </svg>
                );
              case "Assignee":
                return (
                  <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="nonzero"
                      d="M8 9.49951C5.32109 9.49957 2.84382 10.93 1.50451 13.2501C1.43822 13.365 1.42025 13.5014 1.45457 13.6295C1.48888 13.7576 1.57267 13.8668 1.6875 13.9331C1.80235 13.9994 1.93883 14.0173 2.06691 13.983C2.195 13.9487 2.30419 13.8648 2.37048 13.75C3.53197 11.738 5.67677 10.4996 8 10.4995C10.3232 10.4995 12.4681 11.7379 13.6295 13.75C13.6958 13.8648 13.805 13.9487 13.9331 13.983C14.0612 14.0173 14.1976 13.9994 14.3125 13.9331C14.4273 13.8668 14.5111 13.7576 14.5454 13.6295C14.5797 13.5014 14.5611 13.365 14.4955 13.2501C13.1563 10.9299 10.679 9.49944 8 9.49951Z M8 1.5C5.52065 1.5 3.5 3.52065 3.5 6C3.5 8.47935 5.52065 10.4995 8 10.4995C10.4793 10.4995 12.5 8.47935 12.5 6C12.5 3.52065 10.4793 1.5 8 1.5ZM8 2.5C9.9389 2.5 11.5 4.0611 11.5 6C11.5 7.9389 9.9389 9.49951 8 9.49951C6.0611 9.49951 4.5 7.9389 4.5 6C4.5 4.0611 6.0611 2.5 8 2.5Z"
                    />
                  </svg>
                );
              case "Status":
                return (
                  <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="nonzero"
                      d="M5.77625 6.75073C5.64385 6.74375 5.5141 6.78963 5.41553 6.8783C5.36671 6.92222 5.32702 6.97532 5.29873 7.03458C5.27044 7.09384 5.2541 7.1581 5.25064 7.22367C5.24719 7.28925 5.25668 7.35486 5.27858 7.41677C5.30048 7.47868 5.33437 7.53566 5.3783 7.58447L7.6283 10.0845C7.67519 10.1366 7.73251 10.1782 7.79655 10.2068C7.86058 10.2353 7.9299 10.25 8 10.25C8.0701 10.25 8.13942 10.2353 8.20345 10.2068C8.26749 10.1782 8.32481 10.1366 8.3717 10.0845L10.6217 7.58447C10.6656 7.53566 10.6995 7.47868 10.7214 7.41677C10.7433 7.35486 10.7528 7.28925 10.7494 7.22367C10.7459 7.1581 10.7296 7.09384 10.7013 7.03458C10.673 6.97532 10.6333 6.92222 10.5845 6.8783C10.5357 6.83437 10.4787 6.80048 10.4168 6.77858C10.3549 6.75668 10.2892 6.74719 10.2237 6.75064C10.1581 6.7541 10.0938 6.77044 10.0346 6.79873C9.97532 6.82702 9.92222 6.86671 9.8783 6.91553L8 9.00256L6.1217 6.91553C6.07777 6.86672 6.02464 6.82704 5.96537 6.79877C5.90609 6.77049 5.84183 6.75417 5.77625 6.75073Z M8 1.5C4.41604 1.5 1.5 4.41604 1.5 8C1.5 11.5839 4.41603 14.5 8 14.5C11.5839 14.5 14.5 11.5839 14.5 8C14.5 4.41603 11.5839 1.5 8 1.5ZM8 2.5C11.0435 2.5 13.5 4.95647 13.5 8C13.5 11.0435 11.0435 13.5 8 13.5C4.95647 13.5 2.5 11.0435 2.5 8C2.5 4.95647 4.95647 2.5 8 2.5Z"
                    />
                  </svg>
                );
              case "Attachments":
              case "Attachment...":
                return (
                  <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="nonzero"
                      d="M9.5 1.5C9.36739 1.5 9.24021 1.55268 9.14645 1.64645C9.05268 1.74021 9 1.86739 9 2V5.5C9.00001 5.6326 9.0527 5.75977 9.14646 5.85354C9.24023 5.9473 9.3674 5.99999 9.5 6H13C13.1326 6 13.2598 5.94732 13.3536 5.85355C13.4473 5.75979 13.5 5.63261 13.5 5.5C13.5 5.36739 13.4473 5.24021 13.3536 5.14645C13.2598 5.05268 13.1326 5 13 5H10V2C10 1.86739 9.94732 1.74021 9.85355 1.64645C9.75979 1.55268 9.63261 1.5 9.5 1.5Z M3.5 1.5C2.95364 1.5 2.5 1.95364 2.5 2.5V13.5C2.50007 14.0463 2.95357 14.4999 3.49988 14.5C3.49984 14.5 3.49992 14.5 3.49988 14.5H12.5C13.0464 14.5 13.5 14.0464 13.5 13.5V5.5C13.5 5.36739 13.4473 5.24021 13.3536 5.14645L9.85355 1.64645C9.75979 1.55268 9.63261 1.5 9.5 1.5H3.5ZM3.5 2.5H9.29285L12.5 5.70715V13.5H3.50012L3.5 2.5Z"
                    />
                  </svg>
                );
              case "Number":
                return (
                  <svg className="h-4 w-4 text-neutral-700" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="nonzero"
                      d="M6 2C5.86739 2 5.74021 2.05268 5.64645 2.14645C5.55268 2.24021 5.5 2.36739 5.5 2.5V5.5H2.5C2.36739 5.5 2.24021 5.55268 2.14645 5.64645C2.05268 5.74021 2 5.86739 2 6C2 6.13261 2.05268 6.25979 2.14645 6.3536C2.24021 6.4473 2.36739 6.5 2.5 6.5H5.5V9.5H2.5C2.36739 9.5 2.24021 9.55268 2.14645 9.64645C2.05268 9.74021 2 9.86739 2 10C2 10.1326 2.05268 10.2598 2.14645 10.3536C2.24021 10.4473 2.36739 10.5 2.5 10.5H5.5V13.5C5.5 13.6326 5.55268 13.7598 5.64645 13.8536C5.74021 13.9473 5.86739 14 6 14C6.13261 14 6.25979 13.9473 6.35355 13.8536C6.44732 13.7598 6.5 13.6326 6.5 13.5V10.5H9.5V13.5C9.5 13.6326 9.55268 13.7598 9.64645 13.8536C9.74021 13.9473 9.86739 14 10 14C10.1326 14 10.25979 13.9473 10.3536 13.8536C10.4473 13.7598 10.5 13.6326 10.5 13.5V10.5H13.5C13.6326 10.5 13.7598 10.4473 13.8536 10.3536C13.9473 10.2598 14 10.1326 14 10C14 9.86739 13.9473 9.74021 13.8536 9.64645C13.7598 9.55268 13.6326 9.5 13.5 9.5H10.5V6.5H13.5C13.6326 6.5 13.7598 6.44732 13.8536 6.35355C13.9473 6.25979 14 6.1326 14 6C14 5.86739 13.9473 5.74021 13.8536 5.64645C13.7598 5.55268 13.6326 5.5 13.5 5.5H10.5V2.5C10.5 2.36739 10.4473 2.24021 10.3536 2.14645C10.2598 2.05268 10.1326 2 10 2ZM6.5 6.5H9.5V9.5H6.5V6.5Z"
                    />
                  </svg>
                );
              default:
                return <span className="h-1 w-1 rounded-full bg-neutral-500" />;
            }
          })();

          const isAttachmentHeader = c.name === "Attachment...";

          return (
            <div className="relative w-full h-full">
              {colIsFiltered && (
                <div aria-hidden className="absolute inset-0 -mx-2" style={{ backgroundColor: "#E8F5E4" }} />
              )}
              <div className="relative z-10 flex h-8 items-center gap-1.5 pr-2 text-[12px] font-medium text-neutral-700">
                <span className="shrink-0">{headerIcon}</span>
                <span className="truncate">{c.name}</span>
                {isAttachmentHeader && (
                  <span className="ml-1 pl-8 text-[16px] leading-none text-neutral-400">ⓘ</span>
                )}
              </div>
            </div>
          );
        },

        accessorFn: (row) => row.data[c.id] ?? "",

        cell: ({ row, getValue, column, table }) => {
          const v = getValue() as string | number | "";

          const isMatch =
            showModal &&
            c.type === "TEXT" &&
            typeof v === "string" &&
            normSearch.length > 0 &&
            v.toLowerCase().includes(normSearch);

          const curRowIndex = row.index;
          const curColIndex = colIndexMap.get(column.id) ?? 0;
          const lastCol = editableColIds.length - 1;
          const lastRow = table.getRowModel().rows.length - 1;

          const atFirstCell = row.index === 0 && (colIndexMap.get(column.id) ?? 0) === 0;
          const atLastCell =
            row.index === lastRow && (colIndexMap.get(column.id) ?? 0) === lastCol;

          const move = (dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab") => {
            let r = curRowIndex;
            let col = curColIndex;

            switch (dir) {
              case "left":
                col = Math.max(0, col - 1);
                break;
              case "right":
                col = Math.min(lastCol, col + 1);
                break;
              case "up":
                r = Math.max(0, r - 1);
                break;
              case "down":
                r = Math.min(table.getRowModel().rows.length - 1, r + 1);
                break;
              case "tab":
                if (col < lastCol) col++;
                else {
                  col = 0;
                  r = Math.min(table.getRowModel().rows.length - 1, r + 1);
                }
                break;
              case "shiftTab":
                if (col > 0) col--;
                else {
                  col = lastCol;
                  r = Math.max(0, r - 1);
                }
                break;
            }

            focusCell(r, col);
          };

          const isAttachmentPlaceholder = c.name === "Attachment...";
          const cellKey = `${row.original.id}:${c.id}`;
          const isActiveHit = !!normSearch && focusedCellKey === cellKey;
          const suppressChrome = suppressFocusKey === cellKey;

          return (
            <div
              className="relative h-9"
              tabIndex={-1}
              style={colIsFiltered ? { backgroundColor: "#DEF7D9" } : undefined}
            >
              {isMatch && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundColor: isActiveHit ? ACTIVE_HILITE : HILITE }}
                />
              )}

              {isAttachmentPlaceholder && v === "" && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center px-2 text-[12px] text-neutral-500 group-focus-within:hidden">
                  <span className="truncate">Required field(s) are...</span>
                  <span className="ml-auto pl-2 text-[12px] text-neutral-400">ⓘ</span>
                </div>
              )}

              <div className={"relative z-10 " + (suppressChrome ? "no-focus-chrome" : "")}>
                <CellEditor
                  key={`${row.original.id}:${c.id}`}
                  initial={v}
                  isNumber={c.type === "NUMBER"}
                  onCommit={(finalVal) => {
                    scheduleCommit(row.original.id, c.id, c.type as "TEXT" | "NUMBER", finalVal);
                  }}
                  onMove={move}
                  inputRefCb={setCellRef(row.original.id, c.id)}
                  allowTabOut={atLastCell}
                  allowShiftTabOut={atFirstCell}
                  shouldAutoFocus={focusedCellKey === `${row.original.id}:${c.id}`}
                />
              </div>
            </div>
          );
        },

        size: c.ordinal === 0 ? 220 : 160,
        minSize: 120,
      });
    }

    return defs;
  }, [
    viewCols,
    colIndexMap,
    editableColIds,
    setCellRef,
    focusCell,
    scheduleCommit,
    focusedCellKey,
    normSearch,
    suppressFocusKey,
    highlightedCols,
    showModal,
  ]);

  /* ---------------- build TanStack table instance ---------------- */
  const table = useReactTable<RowRecord>({
    data: filteredRows,
    columns: columnDefs,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });
  tableRef.current = table;
  const allSelected = table.getIsAllRowsSelected();

  /* ---------------- find modal: matches + navigation ---------------- */
  const recordCount = useMemo(
    () => (normSearch && showModal ? filteredRows.length : 0),
    [filteredRows, normSearch, showModal]
  );
  const fieldCount = 0;
  const cellCount = matches.length;

  const [hitIndex, setHitIndex] = useState(0);

  useEffect(() => {
    if (!showModal) return;
    if (matches.length === 0) {
      setHitIndex(0);
      return;
    }
    setHitIndex((prev) => {
      const n = matches.length;
      return ((prev % n) + n) % n;
    });
  }, [matches.length, showModal]);

  const goto = useCallback(
    (i: number) => {
      if (matches.length === 0) return;
      const n = matches.length;
      const clamped = ((i % n) + n) % n;
      setHitIndex(clamped);
      const m = matches[clamped]!;
      const colIdx = colIndexMap.get(m.colId) ?? 0;
      suppressSelectNextFocusRef.current = true;
      setSuppressFocusKey(`${m.rowId}:${m.colId}`);
      focusCell(m.rowIndex, colIdx);
    },
    [matches, focusCell, colIndexMap]
  );

  const onPrev = useCallback(() => goto(hitIndex - 1), [goto, hitIndex]);
  const onNext = useCallback(() => goto(hitIndex + 1), [goto, hitIndex]);

  /* ---------------- row-aware prefetch before the end of 200 ---------------- */
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // tune these to taste
  const ROW_H = 36; // ~h-9 cell height
  const ROW_PREFETCH_THRESHOLD_ROWS = 100; // start the next fetch when <120 rows remain below viewport
  const MIN_PAGE_BUFFER = 3; // try to keep at least 3 pages (3*200 rows) ahead
  const MAX_PREFETCH_PAGES_PER_PARAM = 16; // safety cap per search/filter combo
  const SPECULATIVE_BURST_PAGES = 2; // when very close or just loaded, fetch up to 2 pages quickly

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;

    let filling = false;
    let fetchedForThisParam = 0;

    const rowsLoaded = () => filteredRows.length;
    const rowsVisible = () => Math.ceil(el.clientHeight / ROW_H);
    const topIndex = () => Math.floor(el.scrollTop / ROW_H);
    const remainingBelow = () => rowsLoaded() - (topIndex() + rowsVisible());

    const canFetch = () =>
      rowsQ.hasNextPage &&
      !rowsQ.isFetchingNextPage &&
      fetchedForThisParam < MAX_PREFETCH_PAGES_PER_PARAM;

    const doFetch = async () => {
      if (!canFetch()) return false;
      await rowsQ.fetchNextPage();
      fetchedForThisParam++;
      // let layout settle so scrollHeight updates before we decide to fetch again
      await new Promise(requestAnimationFrame);
      return true;
    };

    const burstFetch = async (pages: number) => {
      for (let i = 0; i < pages; i++) {
        const ok = await doFetch();
        if (!ok) break;
      }
    };

    const fillAhead = async (isAggressive = false) => {
      if (filling) return;
      filling = true;
      try {
        // 1) if we're within row threshold, keep fetching until we have a cushion
        while (canFetch() && remainingBelow() < ROW_PREFETCH_THRESHOLD_ROWS) {
          const ok = await doFetch();
          if (!ok) break;
        }

        // 2) keep a minimum page buffer ahead of the viewport
        const pagesLoaded = rowsQ.data?.pages?.length ?? 0;
        while (canFetch() && pagesLoaded + 0 < MIN_PAGE_BUFFER + 1) {
          const ok = await doFetch();
          if (!ok) break;
        }

        // 3) aggressive burst when user is very close or we just mounted/changed params
        if (isAggressive || remainingBelow() < ROW_PREFETCH_THRESHOLD_ROWS / 2) {
          await burstFetch(SPECULATIVE_BURST_PAGES);
        }
      } finally {
        filling = false;
      }
    };

    // fire on scroll & wheel for slightly faster reaction on rapid flicks
    let ticking = false;
    const onScrollish = () => {
      if (!canFetch()) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (remainingBelow() < ROW_PREFETCH_THRESHOLD_ROWS) {
          void fillAhead(false);
        }
      });
    };

    // reset burst limiter for this param combo
    fetchedForThisParam = 0;

    // initial/param-change fill — aggressive to hide first boundary quickly
    void fillAhead(true);

    el.addEventListener("scroll", onScrollish, { passive: true });
    el.addEventListener("wheel", onScrollish, { passive: true });
    const ro = new ResizeObserver(() => void fillAhead(false));
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScrollish);
      el.removeEventListener("wheel", onScrollish);
      ro.disconnect();
    };
  // re-run when pages/filters/search change
  }, [
    rowsQ.hasNextPage,
    rowsQ.isFetchingNextPage,
    rowsQ.data?.pages?.length,
    filteredRows.length,
    debouncedSearch,
    filterConditions,
  ]);

  /* ---------------- measure header height for the ViewsPanel offset ---------------- */
  const toolbarWrapRef = useRef<HTMLDivElement>(null);
  const viewbarWrapRef = useRef<HTMLDivElement>(null);
  const [hideOpen, setHideOpen] = useState(false);
  const hideBtnRef = useRef<HTMLButtonElement | null>(null);

  const hideModalFields = useMemo(
    () =>
      viewCols.map((c) => ({
        id: c.id,
        label: c.name,
        type: c.type,
        hidden: !!c.hidden,
      })),
    [viewCols]
  );

  const [panelHeaderH, setPanelHeaderH] = useState<number>(96);

  useEffect(() => {
    const calc = () => {
      const h2 = viewbarWrapRef.current?.getBoundingClientRect().height ?? 0;
      setPanelHeaderH(h2);
    };

    const ro = new ResizeObserver(calc);
    if (toolbarWrapRef.current) ro.observe(toolbarWrapRef.current);
    if (viewbarWrapRef.current) ro.observe(viewbarWrapRef.current);

    calc();

    return () => ro.disconnect();
  }, []);

  // --- Grid remount key: re-create DataGrid when visible/hidden set for current view changes
  const gridKey = useMemo(
    () => viewCols.map((c) => `${c.id}:${c.hidden ? 1 : 0}`).join("|"),
    [viewCols]
  );

  /* ---------------- loading / error states ---------------- */
  if (baseLoading || tablesQ.isLoading) {
    return <div className="p-6 text-sm" />; // top-level base/tables loading
  }
  if (baseErr) return <div className="p-6 text-red-600">Error: {baseErr.message}</div>;

  if (!tableId) {
    return <div className="p-6 text-sm">Preparing your first table…</div>;
  }

  if (colsErr) return <div className="p-6 text-red-600">Error: {colsErr.message}</div>;
  if (!base) return <div className="p-6">Not found.</div>;

  // GRID readiness: empty while loading (no skeleton, just hidden grid until data is ready)
  const gridLoading = colsLoading || rowsQ.isLoading || !colsFromServer || !rowsQ.data;

  /* ---------------- UI ---------------- */
  return (
    <div className="relative flex h-screen flex-row overflow-hidden bg-white text-[13px] text-neutral-700">
      <LeftRail baseName={base?.name} />

      {/* Right side */}
      <div
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
        style={{ paddingLeft: BASE_RAIL_W }}
      >
        <div ref={toolbarWrapRef}>
          <BaseHeaderToolbar
            baseName={base?.name}
            baseColor={base?.color ?? "#d4a257"}
            tables={(tablesQ.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
            activeTableId={tableId}
            onSwitchTable={switchToTable}
            onAddTable={() => {
              if (!baseId || createTable.isPending) return;
              createTable.mutate({ baseId: String(baseId), name: makeNextTableName() });
            }}
            isCreatingTable={createTable.isPending}
          />
        </div>

        <div ref={viewbarWrapRef}>
          <ViewHeaderBar
            key={activeViewId ?? "no-view"} // remount per view to avoid stale local state
            onAddDemoRows={() => {
              if (!tableId || bulkAdd.isPending) return;
              bulkAdd.mutate({ tableId, count: 100000 });
            }}
            isAddingDemoRows={bulkAdd.isPending}
            search={searchText}
            onOpenSearchModal={() => setShowModal((o) => !o)}
            fieldOptions={unifiedCols.map((c) => ({
              id: c.id,
              label: c.name,
              type: c.type as "TEXT" | "NUMBER",
            }))}
            seedHiddenMap={seedHiddenMap}
            onChangeHiddenMap={onHeaderHiddenChange}
            conditions={filterConditions}
            onChangeConditions={setFilterConditions}
            onToggleViews={() => setViewsOpen((o) => !o)}
            activeViewName={activeViewName}
          />
        </div>

        {/* Grid + footer */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            marginLeft: viewsOpen ? VIEWS_PANEL_W : 0,
            transition: "margin-left 150ms ease",
          }}
        >
          <div ref={gridScrollRef} className="min-h-0 flex-1 overflow-auto grid-scroll">
            {!gridLoading && (
              <DataGrid<RowRecord>
                key={gridKey}
                table={table}
                allSelected={allSelected}
                containerRef={gridScrollRef}
                onAddRow={() => addRowMut.mutate({ tableId, data: makeEmptyRow() })}
                onAddTextColumn={handleAddTextColumn}
                onAddNumberColumn={handleAddNumberColumn}
                showLoadingMore={false}
              />
            )}
            {/* when gridLoading === true, this area stays intentionally empty */}
          </div>

          <div className="flex items-center gap-2 border-t border-neutral-200 px-4 py-2 text-[12px] text-neutral-500">
            <span>{!gridLoading ? totalRecords : 0} records</span>
          </div>
        </div>
      </div>

      {/* LEFT Views side panel */}
      <ViewsPanel
        open={viewsOpen}
        headerHeight={panelHeaderH}
        width={VIEWS_PANEL_W}
        views={views}
        activeViewId={activeViewId}
        onSelect={(id) => {
          setActiveViewId(id);
          if (baseId && tableId) {
            const params = new URLSearchParams(Array.from(searchParams.entries()));
            params.set("t", tableId);
            params.set("v", id);
            router.replace(`/b/${String(baseId)}?${params.toString()}`);
          }
        }}
        onCreate={addView}
        onClose={() => setViewsOpen(false)}
        leftOffset={BASE_RAIL_W}
      />

      {/* Search results modal */}
      {showModal && (
        <SearchResultsModal
          open={showModal}
          term={searchText}
          matches={matches}
          hitIndex={hitIndex}
          onPrev={onPrev}
          onNext={onNext}
          onGoto={goto}
          onClose={() => setShowModal(false)}
          onTermChange={setSearchText}
        />
      )}

      {/* Standalone Hide Fields modal */}
      {hideOpen && (
        <HideFieldsModal
          anchorEl={hideBtnRef.current}
          onClose={() => setHideOpen(false)}
          fields={viewCols.map((c) => ({
            id: c.id,
            label: c.name,
            type: c.type,
            hidden: !!c.hidden,
          }))}
          onToggle={(id) => {
            const curHidden = !!viewCols.find((c) => c.id === id)?.hidden;
            setHidden(id, !curHidden);
          }}
          onHideAll={hideAll}
          onShowAll={showAll}
        />
      )}

      <style jsx global>{`
        .no-focus-chrome input:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .no-focus-chrome input::selection {
          background: transparent !important;
          color: inherit !important;
        }
        .no-focus-chrome input::-moz-selection {
          background: transparent !important;
          color: inherit !important;
        }
      `}</style>
    </div>
  );
}
