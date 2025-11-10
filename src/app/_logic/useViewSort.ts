// app/_logic/useViewSort.ts
import { useMemo } from "react";

export type SortDir = "asc" | "desc";
export type SortRule = { fieldId: string; dir: SortDir };
export type Field = { id: string; label: string; type: "TEXT" | "NUMBER" };

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: false });
const cmpText = (a: unknown, b: unknown) =>
  collator.compare(String(a ?? ""), String(b ?? ""));

type GetCell<Row> = (row: Row, fieldId: string) => unknown;

export function useViewSort<Row>(
  rows: Row[],
  rules: SortRule[],
  fields: Field[],
  getCell: GetCell<Row>
) {
  return useMemo(() => {
    if (!rules.length) return rows;

    const typeById = new Map(fields.map(f => [f.id, f.type]));

    const cmpRow = (a: Row, b: Row) => {
      for (const r of rules) {
        const t = typeById.get(r.fieldId) ?? "TEXT";

        if (t === "NUMBER") {
          const va = getCell(a, r.fieldId);
          const vb = getCell(b, r.fieldId);
          const na = va == null || va === "" ? NaN : Number(va);
          const nb = vb == null || vb === "" ? NaN : Number(vb);
          const aNaN = Number.isNaN(na);
          const bNaN = Number.isNaN(nb);

          // blanks are "lowest":
          // asc  -> blanks FIRST
          // desc -> blanks LAST
          if (aNaN || bNaN) {
            if (aNaN && bNaN) return 0;
            if (r.dir === "asc") return aNaN ? -1 : 1;
            return aNaN ? 1 : -1;
          }

          const base = na < nb ? -1 : na > nb ? 1 : 0;
          if (base !== 0) return r.dir === "desc" ? -base : base;
        } else {
          const base = cmpText(getCell(a, r.fieldId), getCell(b, r.fieldId));
          if (base !== 0) return r.dir === "desc" ? -base : base;
        }
      }

      // stable tiebreak
      const ida = String(getCell(a, "__row_id__") ?? "");
      const idb = String(getCell(b, "__row_id__") ?? "");
      return ida < idb ? -1 : ida > idb ? 1 : 0;
    };

    const copy = rows.slice();
    copy.sort(cmpRow);
    return copy;
  }, [rows, rules, fields, getCell]);
}
