"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import SelectableCheckbox from "~/app/_components/SelectableCheckbox";
import CellEditor from "~/app/_components/CellEditor";
import LeftRail from "~/app/_components/LeftRail";
import BaseHeaderToolbar from "~/app/_components/BaseHeaderToolbar";
import DataGrid from "~/app/_components/DataGrid";
import ViewHeaderBar from "~/app/_components/ViewHeaderBar";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";

/* ---------------- UI helpers ---------------- */
const SIDEBAR_W_CLASS = "pl-14";

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
  const search = useSearchParams();
  const urlTableId = search.get("t") ?? "";

  const tableId = urlTableId;
  const utils = api.useUtils();

  /* ---------------- Base + tables ---------------- */
  const { data: base, isLoading: baseLoading, error: baseErr } =
    api.base.byId.useQuery({ id: String(baseId) });

  const tablesQ = api.table.list.useQuery(
    { baseId: String(baseId) },
    { enabled: !!baseId }
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

  // helper: "Table N" naming
  const makeNextTableName = () => {
    const names = (tablesQ.data ?? []).map((t) => t.name ?? "");
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

  // bootstrap first table if needed
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId, urlTableId, tablesQ.status, tablesQ.data, createTable.isPending]);

  /* ---------------- Columns + rows ---------------- */

  // columns for THIS table
  const {
    data: colsFromServer,
    isLoading: colsLoading,
    error: colsErr,
  } = api.table.meta.useQuery({ tableId }, { enabled: !!tableId });

  // local optimistic columns
  const [localCols, setLocalCols] = useState<ColumnMeta[] | null>(null);

  // reset optimistic cols whenever the table changes
  useEffect(() => {
    setLocalCols(null);
  }, [tableId]);

  // merge server + optimistic
  const unifiedCols: ColumnMeta[] = useMemo(() => {
    return (localCols ?? (colsFromServer as ColumnMeta[] | undefined) ?? [])
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal);
  }, [localCols, colsFromServer]);

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

  /* ---------------- selection state ---------------- */
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  /* ---------------- grid helpers ---------------- */

  // editable columns (visible)
  const editableColIds = useMemo(
    () => unifiedCols.filter((c) => !c.hidden).map((c) => c.id),
    [unifiedCols]
  );

  const colIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    editableColIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [editableColIds]);

  // refs for focusing cells by [rowId:colId]
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const setCellRef =
    (rowId: string, colId: string) => (el: HTMLInputElement | null) => {
      cellRefs.current[`${rowId}:${colId}`] = el;
    };

  // programmatic keyboard nav focus
  const focusCell = (rowIndex: number, colIndex: number) => {
    const tryFocus = () => {
      const r = table.getRowModel().rows[rowIndex];
      const cId = editableColIds[colIndex];
      if (!r || !cId) return;

      const el = cellRefs.current[`${r.original.id}:${cId}`];
      if (el) {
        el.focus({ preventScroll: true } as any);
        el.select();
      } else {
        requestAnimationFrame(tryFocus);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(tryFocus));
  };

  /* ---------------- mutations ---------------- */

  // keep track of last committed value per cell so we don't spam dupes
  const lastCommittedRef = useRef<Record<string, string | number | "">>({});

  // store "there's a cell that needs to be saved"
  type PendingCommit = {
    rowId: string;
    columnId: string;
    colType: "TEXT" | "NUMBER";
    value: string | number | "";
  };

  const pendingQueueRef = useRef<PendingCommit[]>([]);

  const updateCell = api.row.updateCell.useMutation({
    onMutate: async (vars) => {
      // cancel inflight fetches
      await utils.row.list.cancel({ tableId, limit: 200 });

      const prev = utils.row.list.getInfiniteData({ tableId, limit: 200 });

      // optimistic patch
      utils.row.list.setInfiniteData({ tableId, limit: 200 }, (data) => {
        if (!data) return data;

        const pages = data.pages.map((p) => {
          const rows = p.rows.map((r: any) => {
            if (r.id !== vars.rowId) return r;

            const oldVal = r.data?.[vars.columnId];
            const newVal = String(vars.value);

            if (String(oldVal ?? "") === newVal) {
              return r; // nothing changed
            }

            return {
              ...r,
              data: {
                ...r.data,
                [vars.columnId]: newVal,
              },
            };
          });
          return { ...p, rows };
        });

        return { ...data, pages };
      });

      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) {
        utils.row.list.setInfiniteData({ tableId, limit: 200 }, ctx.prev);
      }
    },
  });

  // Instead of mutating immediately (which steals focus mid-click), we just record it here.
  const scheduleCommit = (
    rowId: string,
    columnId: string,
    colType: "TEXT" | "NUMBER",
    value: string | number | ""
  ) => {
    const cellKey = rowId + ":" + columnId;

    // If this value is the same as the last one we *already sent*, skip.
    if (
      String(lastCommittedRef.current[cellKey] ?? "") ===
      String(value ?? "")
    ) {
      return;
    }

    // If the *exact same* commit is already queued and unsent, don't enqueue a duplicate.
    const alreadyQueued = pendingQueueRef.current.some(
      (c) =>
        c.rowId === rowId &&
        c.columnId === columnId &&
        String(c.value ?? "") === String(value ?? "")
    );
    if (alreadyQueued) return;

    pendingQueueRef.current.push({ rowId, columnId, colType, value });
  };

  // 🔑 After every render, if there's a pending commit AND focus is already
  // sitting in some cell <input>, then it's safe to fire the mutation.
  useEffect(() => {
    if (pendingQueueRef.current.length === 0) return;

    // This will send every queued commit and mark them as sent.
    const flushAll = () => {
      if (pendingQueueRef.current.length === 0) return;

      const commitsToSend = pendingQueueRef.current;
      pendingQueueRef.current = [];

      for (const commit of commitsToSend) {
        const { rowId, columnId, colType, value } = commit;
        const cellKey = rowId + ":" + columnId;

        // record last committed so we don't resend same value later
        lastCommittedRef.current[cellKey] = value;

        updateCell.mutate({
          rowId,
          columnId,
          value,
          colType,
        });
      }
    };

    const active = document.activeElement;
    const isCellInput =
      active &&
      active.tagName === "INPUT" &&
      (active as HTMLInputElement).type !== "checkbox";

    if (isCellInput) {
      // User is already focused in a new cell input, safe to flush now.
      flushAll();
    } else {
      // No focused text cell (maybe clicked whitespace / header / checkbox).
      // Give the browser one more frame to settle focus, then flush anyway
      // so we don't lose data.
      requestAnimationFrame(() => {
        flushAll();
      });
    }
  });

  /* ---------------- row.create mutation ---------------- */

  const makeEmptyRow = () =>
    Object.fromEntries(unifiedCols.map((c) => [c.id, ""])) as Record<
      string,
      string | number | ""
    >;

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
              { rows: [optimisticRow], nextCursor: undefined, total: 1 },
            ],
          } as any;
        }

        const pages = old.pages.map((p, i, arr) =>
          i === arr.length - 1
            ? { ...p, rows: [...p.rows, optimisticRow] }
            : p
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
          rows: p.rows.map((r: any) => {
            if (r.id === ctx.tempId) {
              return {
                ...r,
                id: realRow.id,
                createdAt: realRow.createdAt,
                data: r.data, // keep optimistic data
              };
            }
            return r;
          }),
        }));

        return { ...old, pages };
      });
    },
  });

  /* ---------------- column.create mutation ---------------- */

  const makeNextColumnName = () => {
    const names = unifiedCols.map((c) => c.name);
    let n = 1;
    while (names.includes(`Field ${n}`)) n++;
    return `Field ${n}`;
  };

  const createColumn = api.column.create.useMutation({
    onMutate: async (vars) => {
      const maxOrdinal =
        unifiedCols.reduce(
          (acc, c) => (c.ordinal > acc ? c.ordinal : acc),
          -1
        ) ?? -1;
      const nextOrdinal = maxOrdinal + 1;

      const tempId = `temp-col-${Date.now()}`;

      setLocalCols((prev) => {
        const baseCols =
          prev ?? (colsFromServer as ColumnMeta[] | undefined) ?? [];
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
        const baseCols =
          prev ?? (colsFromServer as ColumnMeta[] | undefined) ?? [];
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

  const handleAddColumn = () => {
    if (!tableId || createColumn.isPending) return;
    createColumn.mutate({
      tableId,
      name: makeNextColumnName(),
      type: "TEXT",
    });
  };

  /* ---------------- ColumnDefs for TanStack Table ---------------- */

  const columnDefs: ColumnDef<RowRecord, any>[] = useMemo(() => {
    const defs: ColumnDef<RowRecord, any>[] = [];

    // checkbox / index column
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

    // real data columns
    for (const c of unifiedCols) {
      if (c.hidden) continue;

      defs.push({
        id: c.id,

        header: () => {
          const headerIcon = (() => {
            switch (c.name) {
              case "Name":
                return (
                  <svg
                    className="h-4 w-4 text-neutral-700"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8.44187 3.26606C8.35522 3.10237 8.18518 3 7.99998 3C7.81477 3 7.64474 3.10237 7.55808 3.26606L3.05808 11.7661C2.92888 12.0101 3.02198 12.3127 3.26603 12.4419C3.51009 12.5711 3.81267 12.478 3.94187 12.2339L5.12455 10H10.8754L12.0581 12.2339C12.1873 12.478 12.4899 12.5711 12.7339 12.4419C12.978 12.3127 13.0711 12.0101 12.9419 11.7661L8.44187 3.26606ZM10.346 9L7.99998 4.56863L5.65396 9H10.346Z" />
                  </svg>
                );
              case "Notes":
                return (
                  <svg
                    className="h-4 w-4 text-neutral-700"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M4.24999 3C4.43937 3 4.6125 3.107 4.6972 3.27639L6.4472 6.77639C6.5707 7.02338 6.47058 7.32372 6.22359 7.44721C5.9766 7.57071 5.67627 7.4706 5.55277 7.22361L5.17327 6.4646H3.3267L2.9472 7.22361C2.82371 7.4706 2.52337 7.57071 2.27638 7.44721C2.02939 7.32372 1.92928 7.02338 2.05277 6.77639L3.80277 3.27639C3.88747 3.107 4.0606 3 4.24999 3ZM3.8267 5.4646H4.67327L4.24999 4.61803L3.8267 5.4646ZM7.5 3.75C7.22386 3.75 7 3.97386 7 4.25C7 4.52614 7.22386 4.75 7.5 4.75H13.5C13.7761 4.75 14 4.52614 14 4.25C14 3.97386 13.7761 3.75 13.5 3.75H7.5ZM8 6.75C8 6.47386 8.22386 6.25 8.5 6.25H11.5C11.7761 6.25 12 6.47386 12 6.75C12 7.02614 11.7761 7.25 11.5 7.25H8.5C8.22386 7.25 8 7.02614 8 6.75ZM2 9.25C2 8.97386 2.22386 8.75 2.5 8.75H13.5C13.7761 8.75 14 8.97386 14 9.25C14 9.52614 13.7761 9.75 13.5 9.75H2.5C2.22386 9.75 2 9.52614 2 9.25ZM2 11.75C2 11.4739 2.22386 11.25 2.5 11.25H11.5C11.7761 11.25 12 11.4739 12 11.75C12 12.0261 11.7761 12.25 11.5 12.25H2.5C2.22386 12.25 2 12.0261 2 11.75Z" />
                  </svg>
                );
              case "Assignee":
                return (
                  <svg
                    className="h-4 w-4 text-neutral-700"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 9.49951C5.32109 9.49957 2.84382 10.93 1.50451 13.2501C1.43822 13.365 1.42025 13.5014 1.45457 13.6295C1.48888 13.7576 1.57267 13.8668 1.6875 13.9331C1.80235 13.9994 1.93883 14.0173 2.06691 13.983C2.195 13.9487 2.30419 13.8648 2.37048 13.75C3.53197 11.738 5.67677 10.4996 8 10.4995C10.3232 10.4995 12.4681 11.7379 13.6295 13.75C13.6958 13.8648 13.805 13.9487 13.9331 13.983C14.0612 14.0173 14.1976 13.9994 14.3125 13.9331C14.4273 13.8668 14.5111 13.7576 14.5454 13.6295C14.5797 13.5014 14.5618 13.365 14.4955 13.2501C13.1563 10.9299 10.679 9.49944 8 9.49951ZM8 1.5C5.52065 1.5 3.5 3.52065 3.5 6C3.5 8.47935 5.52065 10.4995 8 10.4995C10.4793 10.4995 12.5 8.47935 12.5 6C12.5 3.52065 10.4793 1.5 8 1.5ZM8 2.5C9.9389 2.5 11.5 4.0611 11.5 6C11.5 7.9389 9.9389 9.49951 8 9.49951C6.0611 9.49951 4.5 7.9389 4.5 6C4.5 4.0611 6.0611 2.5 8 2.5Z" />
                  </svg>
                );
              case "Status":
                return (
                  <svg
                    className="h-4 w-4 text-neutral-700"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M5.77625 6.75073C5.64385 6.74375 5.5141 6.78963 5.41553 6.8783C5.36671 6.92222 5.32702 6.97532 5.29873 7.03458C5.27044 7.09384 5.2541 7.1581 5.25064 7.22367C5.24719 7.28925 5.25668 7.35486 5.27858 7.41677C5.30048 7.47868 5.33437 7.53566 5.3783 7.58447L7.6283 10.0845C7.67519 10.1366 7.73251 10.1782 7.79655 10.2068C7.86058 10.2353 7.9299 10.25 8 10.25C8.0701 10.25 8.13942 10.2353 8.20345 10.2068C8.26749 10.1782 8.32481 10.1366 8.3717 10.0845L10.6217 7.58447C10.6656 7.53566 10.6995 7.47868 10.7214 7.41677C10.7433 7.35486 10.7528 7.28925 10.7494 7.22367C10.7459 7.1581 10.7296 7.09384 10.7013 7.03458C10.673 6.97532 10.6333 6.92222 10.5845 6.8783C10.5357 6.83437 10.4787 6.80048 10.4168 6.77858C10.3549 6.75668 10.2892 6.74719 10.2237 6.75064C10.1581 6.7541 10.0938 6.77044 10.0346 6.79873C9.97532 6.82702 9.92222 6.86671 9.8783 6.91553L8 9.00256L6.1217 6.91553C6.07777 6.86672 6.02464 6.82704 5.96537 6.79877C5.90609 6.77049 5.84183 6.75417 5.77625 6.75073ZM8 1.5C4.41604 1.5 1.5 4.41604 1.5 8C1.5 11.5839 4.41603 14.5 8 14.5C11.5839 14.5 14.5 11.5839 14.5 8C14.5 4.41603 11.5839 1.5 8 1.5ZM8 2.5C11.0435 2.5 13.5 4.95647 13.5 8C13.5 11.0435 11.0435 13.5 8 13.5C4.95647 13.5 2.5 11.0435 2.5 8C2.5 4.95647 4.95647 2.5 8 2.5Z" />
                  </svg>
                );
              case "Attachments":
              case "Attachment...":
                return (
                  <svg
                    className="h-4 w-4 text-neutral-700"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M9.5 1.5C9.36739 1.5 9.24021 1.55268 9.14645 1.64645C9.05268 1.74021 9 1.86739 9 2V5.5C9.00001 5.6326 9.0527 5.75977 9.14646 5.85354C9.24023 5.9473 9.3674 5.99999 9.5 6H13C13.1326 6 13.2598 5.94732 13.3536 5.85355C13.4473 5.75979 13.5 5.63261 13.5 5.5C13.5 5.36739 13.4473 5.24021 13.3536 5.14645C13.2598 5.05268 13.1326 5 13 5H10V2C10 1.86739 9.94732 1.74021 9.85355 1.64645C9.75979 1.55268 9.63261 1.5 9.5 1.5Z M3.5 1.5C2.95364 1.5 2.5 1.95364 2.5 2.5V13.5C2.50007 14.0463 2.95357 14.4999 3.49988 14.5H12.5C13.0464 14.5 13.5 14.0464 13.5 13.5V5.5C13.5 5.36739 13.4473 5.24021 13.3536 5.14645L9.85355 1.64645C9.75979 1.55268 9.63261 1.5 9.5 1.5H3.5ZM3.5 2.5H9.29285L12.5 5.70715V13.5H3.50012L3.5 2.5Z" />
                  </svg>
                );
              default:
                return (
                  <span className="h-1 w-1 rounded-full bg-neutral-500" />
                );
            }
          })();

          const isAttachmentHeader = c.name === "Attachment...";

          return (
            <div className="flex h-8 items-center gap-1.5 pr-2 text-[12px] font-medium text-neutral-700">
              <span className="shrink-0">{headerIcon}</span>
              <span className="truncate">{c.name}</span>
              {isAttachmentHeader && (
                <span className="ml-1 pl-8 text-[16px] leading-none text-neutral-400">
                  ⓘ
                </span>
              )}
            </div>
          );
        },

        accessorFn: (row) => row.data[c.id] ?? "",

        cell: ({ row, getValue, column, table }) => {
          const v = getValue() as string | number | "";

          const curRowIndex = row.index;
          const curColIndex = colIndexMap.get(column.id) ?? 0;
          const lastCol = editableColIds.length - 1;
          const lastRow = table.getRowModel().rows.length - 1;

          const atFirstCell =
            row.index === 0 && (colIndexMap.get(column.id) ?? 0) === 0;
          const atLastCell =
            row.index === lastRow &&
            (colIndexMap.get(column.id) ?? 0) === lastCol;

          const move = (
            dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab"
          ) => {
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
                if (col < lastCol) {
                  col++;
                } else {
                  col = 0;
                  r = Math.min(
                    table.getRowModel().rows.length - 1,
                    r + 1
                  );
                }
                break;
              case "shiftTab":
                if (col > 0) {
                  col--;
                } else {
                  col = lastCol;
                  r = Math.max(0, r - 1);
                }
                break;
            }

            // keyboard nav uses programmatic focus
            focusCell(r, col);
          };

          const isAttachmentPlaceholder = c.name === "Attachment...";

          return (
            <div className="group relative h-8">
              {isAttachmentPlaceholder && v === "" && (
                <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-[12px] text-neutral-500 group-focus-within:hidden">
                  <span className="truncate">Required field(s) are...</span>
                  <span className="ml-auto pl-2 text-[12px] text-neutral-400">
                    ⓘ
                  </span>
                </div>
              )}

              <CellEditor
                // IMPORTANT: no `key={row.id + ":" + c.id}`.
                // Let React keep this input mounted so focus isn't blown away.
                initial={v}
                isNumber={c.type === "NUMBER"}
                onCommit={(finalVal) => {
                  scheduleCommit(
                    row.original.id,
                    c.id,
                    c.type as "TEXT" | "NUMBER",
                    finalVal
                  );
                }}
                onMove={move}
                inputRefCb={setCellRef(row.original.id, c.id)}
                allowTabOut={atLastCell}
                allowShiftTabOut={atFirstCell}
              />
            </div>
          );
        },

        size: c.ordinal === 0 ? 220 : 160,
        minSize: 120,
      });
    }

    return defs;
  }, [
    unifiedCols,
    colIndexMap,
    editableColIds,
    setCellRef,
    focusCell,
    scheduleCommit,
  ]);

  /* ---------------- build TanStack table instance ---------------- */
  const table = useReactTable<RowRecord>({
    data: allRows,
    columns: columnDefs,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const allSelected = table.getIsAllRowsSelected();

  /* ---------------- infinite scroll trigger ---------------- */
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!rowsQ.hasNextPage || rowsQ.isFetchingNextPage) return;
      const nearBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 400;
      if (nearBottom) void rowsQ.fetchNextPage();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [rowsQ.hasNextPage, rowsQ.isFetchingNextPage, rowsQ.fetchNextPage]);

  /* ---------------- loading / error states ---------------- */
  if (baseLoading || tablesQ.isLoading) {
    return <div className="p-6 text-sm">Loading…</div>;
  }
  if (baseErr) {
    return <div className="p-6 text-red-600">Error: {baseErr.message}</div>;
  }

  if (!urlTableId) {
    return <div className="p-6 text-sm">Preparing your first table…</div>;
  }

  if (colsLoading) return <div className="p-6 text-sm">Loading…</div>;
  if (colsErr)
    return <div className="p-6 text-red-600">Error: {colsErr.message}</div>;
  if (!base || !colsFromServer)
    return <div className="p-6">Not found.</div>;

  /* ---------------- UI ---------------- */
  return (
    <div className="relative min-h-screen bg-white text-[13px] text-neutral-700">
      {/* LEFT skinny rail */}
      <LeftRail baseName={base?.name} />

      <div className={SIDEBAR_W_CLASS}>
        <BaseHeaderToolbar
          baseName={base?.name}
          baseColor={base?.color ?? "#d4a257"}
          tables={(tablesQ.data ?? []).map((t) => ({
            id: t.id,
            name: t.name,
          }))}
          activeTableId={tableId}
          onSwitchTable={switchToTable}
          onAddTable={handleAddTable}
          isCreatingTable={createTable.isPending}
        />

        <ViewHeaderBar />

        <DataGrid<RowRecord>
          table={table}
          allSelected={allSelected}
          containerRef={containerRef}
          onAddRow={() => addRowMut.mutate({ tableId, data: makeEmptyRow() })}
          onAddColumn={handleAddColumn}
          showLoadingMore={rowsQ.isFetchingNextPage}
        />

        {/* Bottom-left record count */}
        <div className="fixed bottom-4 left-20 flex items-center gap-2">
          <span className="ml-2 text-[12px] text-neutral-500">
            {table.getRowModel().rows.length} records
          </span>
        </div>
      </div>
    </div>
  );
}
