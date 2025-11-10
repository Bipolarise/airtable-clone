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
import { IconFieldName } from "~/app/_icons/IconFieldName";
import { IconFieldNotes } from "~/app/_icons/IconFieldNotes";
import { IconFieldAssignee } from "~/app/_icons/IconFieldAssignee";
import { IconFieldStatus } from "~/app/_icons/IconFieldStatus";
import { IconFieldAttachment } from "~/app/_icons/IconFieldAttachment";
import { IconFieldNumber } from "~/app/_icons/IconFieldNumber";
import { IconTinyDot } from "~/app/_icons/IconTinyDot";
import "~/styles/globals.css";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import { useViewHiddenFields } from "~/app/_logic/useViewHiddenFields";
import { useViewSort } from "~/app/_logic/useViewSort";

import type { Condition } from "~/app/_components/ViewHeaderBar";
import type { SortRule } from "~/app/_components/SortModal";
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

  /* ---- tables list (to confirm existence) ---- */
  const tablesQ = api.table.list.useQuery(
    { baseId: String(baseId) },
    { enabled: !!baseId }
  );

  const tableExists = useMemo(
    () => !!tableId && (tablesQ.data ?? []).some((t) => t.id === tableId),
    [tablesQ.data, tableId]
  );

  // SERVER VIEWS
  const viewsQ = api.view.listByTable.useQuery(
    { tableId: tableId },
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
      return bIsDefault - aIsDefault;
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
      if (tableId) {
        await utils.view.listByTable.invalidate({ tableId });
      }
      setActiveViewId(created.id);

      if (baseId && tableId) {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.set("t", tableId);
        params.set("v", created.id);
        router.replace(`/b/${String(baseId)}?${params.toString()}`);
      }
    },
  });

  // Ensure default "Grid view" — only after table truly exists
  useEffect(() => {
    if (!tableId || !tableExists) return;
    if (viewsQ.isLoading || createView.isPending) return;
    if ((viewsQ.data?.length ?? 0) === 0) {
      createView.mutate({ tableId, name: "Grid view" });
    }
  }, [
    tableId,
    tableExists,
    viewsQ.isLoading,
    viewsQ.data?.length,
    createView.isPending,
    createView,
  ]);

  // hook to add a new view
  const addView = useCallback(() => {
    if (!tableId || !tableExists || createView.isPending) return;
    const n = (views.filter((v) => v.type === "grid").length || 0) + 1;
    createView.mutate({
      tableId,
      name: `Grid view ${n}`,
    });
  }, [tableId, tableExists, createView.isPending, createView, views]);

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
        setActiveViewId(null);
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

  // Pick a default active view once views load — wait for table to exist
  useEffect(() => {
    if (!tableId || !tableExists) return;
    if (activeViewId) return;

    const first =
      views.find((v) => v.name === "Grid view") ?? views[0];

    if (!first) return;

    setActiveViewId(first.id);

    if (baseId && tableId) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("t", tableId);
      params.set("v", first.id);
      router.replace(`/b/${String(baseId)}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, activeViewId, baseId, tableId, tableExists]);

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

  // For the standalone HideFieldsModal
  const toggleHidden = useCallback(
    (id: string) => {
      const curHidden = !!viewCols.find((c) => c.id === id)?.hidden;
      setHidden(id, !curHidden);
    },
    [setHidden, viewCols]
  );

  // Only set diffs coming from child -> parent
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

  // --- Stable "seed" for ViewHeaderBar
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

  // ---- stabilize query params
  const conditionsForQuery = useMemo(
    () => filterConditions,
    [JSON.stringify(filterConditions)]
  );

  // ---- rows (infinite w/ cursor) ----
  const rowsQ = api.row.list.useInfiniteQuery(
    {
      tableId,
      limit: 200,
      search: debouncedSearch,
      conditions: conditionsForQuery,
    },
    {
      enabled: !!tableId,
      getNextPageParam: (last) => (last as any)?.nextCursor ?? undefined,
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

  // No extra client filtering during scroll
  const filteredRows: RowRecord[] = allRows;

  /* ---------------- sorting state & derived rows ---------------- */
  const [sortRules, setSortRules] = useState<SortRule[]>([]);

  const sortedRows = useViewSort<RowRecord>(
    filteredRows,
    sortRules,
    unifiedCols.map((c) => ({ id: c.id, label: c.name, type: c.type })),
    (row, fieldId) =>
      fieldId === "__row_id__" ? row.id : row.data[fieldId as keyof RowRecord["data"]]
  );

  // IDs of columns currently sorted (for column highlighting)
  const sortedFieldIds = useMemo(
    () => sortRules.map((r) => r.fieldId),
    [sortRules]
  );

  /* ---------------- find modal (compute matches only when open) ---------------- */
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
    sortedRows.forEach((r, rIdx) => {
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
  }, [sortedRows, textColIds, normSearch, showModal]);

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

  /* mirror volatile state in refs so columnDefs stays stable */
  const focusedCellKeyRef = useRef<string | null>(null);
  useEffect(() => {
    focusedCellKeyRef.current = focusedCellKey;
  }, [focusedCellKey]);

  const suppressFocusKeyRef = useRef<string | null>(null);
  useEffect(() => {
    suppressFocusKeyRef.current = suppressFocusKey;
  }, [suppressFocusKey]);

  const showModalRef = useRef(false);
  useEffect(() => {
    showModalRef.current = showModal;
  }, [showModal]);

  const normSearchRef = useRef("");
  useEffect(() => {
    normSearchRef.current = normSearch;
  }, [normSearch]);

  const highlightedColsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    highlightedColsRef.current = highlightedCols;
  }, [highlightedCols]);

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
        (el as any).focus({ preventScroll: true });
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
              (freshEl as any).focus({ preventScroll: true });
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
      const q = { tableId, limit: 200, search: debouncedSearch, conditions: conditionsForQuery } as const;

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
      const q = { tableId, limit: 200, search: debouncedSearch, conditions: conditionsForQuery } as const;

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
            pageParams: [null],
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

      // Preserve focus if we were focused in the temp row
      const tempPrefix = `${ctx.tempId}:`;
      if (focusedCellKeyRef.current?.startsWith(tempPrefix)) {
        const nextKey = focusedCellKeyRef.current.replace(ctx.tempId, realRow.id);
        setFocusedCellKey(nextKey);
      }
      if (suppressFocusKeyRef.current?.startsWith(tempPrefix)) {
        const nextKey = suppressFocusKeyRef.current.replace(ctx.tempId, realRow.id);
        setSuppressFocusKey(nextKey);
      }
      // Move element refs from temp to real id
      for (const k of Object.keys(cellRefs.current)) {
        if (k.startsWith(tempPrefix)) {
          const newK = k.replace(ctx.tempId, realRow.id);
          cellRefs.current[newK] = cellRefs.current[k]!;
          delete cellRefs.current[k];
        }
      }
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

      // Preserve focus if focused on temp column id
      if (ctx?.tempId) {
        const tempSuffix = `:${ctx.tempId}`;
        if (focusedCellKeyRef.current?.endsWith(tempSuffix)) {
          const nextKey = focusedCellKeyRef.current.replace(ctx.tempId, real.id);
          setFocusedCellKey(nextKey);
        }
        if (suppressFocusKeyRef.current?.endsWith(tempSuffix)) {
          const nextKey = suppressFocusKeyRef.current.replace(ctx.tempId, real.id);
          setSuppressFocusKey(nextKey);
        }
        // Move element refs from temp column id to real column id
        for (const k of Object.keys(cellRefs.current)) {
          if (k.endsWith(tempSuffix)) {
            const newK = k.replace(ctx.tempId, real.id);
            cellRefs.current[newK] = cellRefs.current[k]!;
            delete cellRefs.current[k];
          }
        }
      }
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

      defs.push({
        id: c.id,
        header: () => {
          const colIsFiltered = highlightedColsRef.current.has(c.id);
          const headerIcon = (() => {
            switch (c.name) {
              case "Name":
                return <IconFieldName className="h-4 w-4 text-neutral-700" />;
              case "Notes":
              case "Notes 2":
              case "Notes 3":
                return <IconFieldNotes className="h-4 w-4 text-neutral-700" />;
              case "Assignee":
                return <IconFieldAssignee className="h-4 w-4 text-neutral-700" />;
              case "Status":
                return <IconFieldStatus className="h-4 w-4 text-neutral-700" />;
              case "Attachments":
              case "Attachment...":
              case "Attachment Summary":
                return <IconFieldAttachment className="h-4 w-4 text-neutral-700" />;
              case "Number":
                return <IconFieldNumber className="h-4 w-4 text-neutral-700" />;
              default: {
                if (c.type === "TEXT") return <IconFieldName className="h-4 w-4 text-neutral-700" />;
                if (c.type === "NUMBER") return <IconFieldNumber className="h-4 w-4 text-neutral-700" />;
                return <IconTinyDot className="h-1 w-1 text-neutral-500" />;
              }
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

          const show = showModalRef.current;
          const norm = normSearchRef.current;

          const isMatch =
            show &&
            c.type === "TEXT" &&
            typeof v === "string" &&
            norm.length > 0 &&
            v.toLowerCase().includes(norm);

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
          const isActiveHit = !!norm && focusedCellKeyRef.current === cellKey;
          const suppressChrome = suppressFocusKeyRef.current === cellKey;

          return (
            <div
              className="relative h-9"
              tabIndex={-1}
              style={highlightedColsRef.current.has(c.id) ? { backgroundColor: "#DEF7D9" } : undefined}
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
                  initial={v}
                  isNumber={c.type === "NUMBER"}
                  onCommit={(finalVal) => {
                    scheduleCommit(row.original.id, c.id, c.type as "TEXT" | "NUMBER", finalVal);
                  }}
                  onMove={move}
                  inputRefCb={setCellRef(row.original.id, c.id)}
                  allowTabOut={atLastCell}
                  allowShiftTabOut={atFirstCell}
                  shouldAutoFocus={focusedCellKeyRef.current === `${row.original.id}:${c.id}`}
                  identityKey={`${row.original.id}:${c.id}`}   // ← NEW
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
    // only stable deps here:
  }, [viewCols, colIndexMap, editableColIds, setCellRef, focusCell, scheduleCommit]);

  /* ---------------- build TanStack table instance ---------------- */
  const table = useReactTable<RowRecord>({
    data: sortedRows,
    columns: columnDefs,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    // prevent pagination auto-resets that can trigger update loops
    autoResetPageIndex: false,
    autoResetAll: false,
    columnResizeMode: "onChange",
  });
  tableRef.current = table;
  const allSelected = table.getIsAllRowsSelected();

  /* ---------------- find modal: matches + navigation ---------------- */
  const recordCount = useMemo(
    () => (normSearch && showModal ? sortedRows.length : 0),
    [sortedRows, normSearch, showModal]
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

  /* ---------------- scroll container ---------------- */
  const gridScrollRef = useRef<HTMLDivElement>(null);

  /* ---------------- proactive fill-ahead ---------------- */
  const PAGE_SIZE = 200;
  const ROW_H = 36;
  const ROW_PREFETCH_THRESHOLD_ROWS = 60;
  const MIN_PAGE_BUFFER = 3;
  const PREFETCH_ROWS_BUDGET = 20_000;
  const MAX_PREFETCH_PAGES_PER_PARAM = Math.ceil(PREFETCH_ROWS_BUDGET / PAGE_SIZE);
  const SPECULATIVE_BURST_PAGES = 2;

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;

    let filling = false;
    let fetchedForThisParam = 0;

    const rowsLoaded = () => sortedRows.length;
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
      await new Promise(requestAnimationFrame);
      return true;
    };

    const burstFetch = async (pages: number) => {
      for (let i = 0; i < pages; i++) {
        const ok = await doFetch();
        if (!ok) break;
      }
    };

    const fillAhead = async (aggressive = false) => {
      if (filling) return;
      filling = true;
      try {
        while (canFetch() && remainingBelow() < ROW_PREFETCH_THRESHOLD_ROWS) {
          const ok = await doFetch();
          if (!ok) break;
        }

        let pagesLoaded = rowsQ.data?.pages?.length ?? 0;
        while (canFetch() && pagesLoaded < MIN_PAGE_BUFFER) {
          const ok = await doFetch();
          if (!ok) break;
          pagesLoaded++;
        }

        if (aggressive || remainingBelow() < ROW_PREFETCH_THRESHOLD_ROWS / 2) {
          await burstFetch(SPECULATIVE_BURST_PAGES);
        }
      } finally {
        filling = false;
      }
    };

    fetchedForThisParam = 0;
    void fillAhead(true);

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

    el.addEventListener("scroll", onScrollish, { passive: true });
    el.addEventListener("wheel", onScrollish, { passive: true });

    const ro = new ResizeObserver(() => void fillAhead(false));
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScrollish);
      el.removeEventListener("wheel", onScrollish);
      ro.disconnect();
    };
  }, [
    sortedRows.length,
    rowsQ.hasNextPage,
    rowsQ.isFetchingNextPage,
    rowsQ.data?.pages?.length,
    debouncedSearch,
    conditionsForQuery,
  ]);

  /* ---------------- measure header height ---------------- */
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

  // --- Grid remount key
  const gridKey = useMemo(
    () => viewCols.map((c) => `${c.id}:${c.hidden ? 1 : 0}`).join("|"),
    [viewCols]
  );

  /* ---------------- loading / error states ---------------- */
  if (baseLoading || tablesQ.isLoading) {
    return <div className="p-6 text-sm" />;
  }
  if (baseErr) return <div className="p-6 text-red-600">Error: {baseErr.message}</div>;

  if (!tableId) {
    return <div className="p-6 text-sm">Preparing your first table…</div>;
  }

  if (colsErr) return <div className="p-6 text-red-600">Error: {colsErr.message}</div>;
  if (!base) return <div className="p-6">Not found.</div>;

  // GRID readiness
  const gridLoading =
    colsLoading ||
    !colsFromServer ||
    (!rowsQ.data && rowsQ.isLoading);

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
            key={activeViewId ?? "no-view"}
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
            /* sorting props */
            sortRules={sortRules}
            onChangeSortRules={setSortRules}
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
                /* tell grid which columns are sorted so it can highlight them */
                sortedFieldIds={sortedFieldIds}
              />
            )}

            {/* kept for layout parity */}
            <div style={{ height: 1 }} />
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
