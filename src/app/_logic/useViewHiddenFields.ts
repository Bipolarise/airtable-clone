// src/app/_logic/useViewHiddenFields.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ColumnLike = {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
  hidden: boolean | null;
  ordinal: number;
};

const storageKey = (tableId?: string | null, viewId?: string | null) =>
  `hidden-fields::${tableId ?? "no-table"}::${viewId ?? "__local"}`;

export function useViewHiddenFields<T extends ColumnLike>(
  baseCols: T[],
  tableId?: string | null,
  viewId?: string | null
) {
  // keep a set of hidden column ids for this table+view
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  const keyRef = useRef(storageKey(tableId, viewId));

  // load from localStorage (so each view remembers its layout)
  useEffect(() => {
    const key = storageKey(tableId, viewId);
    keyRef.current = key;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setHiddenSet(new Set(arr));
      } else {
        setHiddenSet(new Set());
      }
    } catch {
      setHiddenSet(new Set());
    }
  }, [tableId, viewId]);

  // persist to localStorage whenever it changes
  useEffect(() => {
    const key = keyRef.current;
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(hiddenSet)));
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, [hiddenSet]);

  // helpers
  const isHidden = useCallback((colId: string) => hiddenSet.has(colId), [hiddenSet]);

  const setHidden = useCallback((colId: string, hidden: boolean) => {
    setHiddenSet((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(colId);
      else next.delete(colId);
      return next;
    });
  }, []);

  const toggleHidden = useCallback((colId: string) => {
    setHiddenSet((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }, []);

  const hideAll = useCallback(() => {
    setHiddenSet(new Set(baseCols.map((c) => c.id)));
  }, [baseCols]);

  const showAll = useCallback(() => {
    setHiddenSet(new Set());
  }, []);

  // apply view-level hidden overlay on top of server `hidden`
  const effectiveCols: T[] = useMemo(() => {
    // keep same order; only override `hidden`
    return baseCols.map((c) => ({
      ...c,
      hidden: (c.hidden ?? false) || hiddenSet.has(c.id),
    }));
  }, [baseCols, hiddenSet]);

  // convenience list for menus
  const visibleCount = useMemo(
    () => effectiveCols.filter((c) => !c.hidden).length,
    [effectiveCols]
  );

  return {
    effectiveCols,
    hiddenSet,
    isHidden,
    setHidden,
    toggleHidden,
    hideAll,
    showAll,
    visibleCount,
  };
}
