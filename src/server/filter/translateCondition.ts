// src/server/filter/translateConditions.ts
import type { Prisma } from "@prisma/client";

export type OperatorId =
  | "contains"
  | "not_contains"
  | "eq"
  | "empty"
  | "not_empty"
  | "gt"
  | "lt";

export type UICondition = {
  id: string;
  join?: "and" | "or";
  fieldId: string | null; // column.id
  op: OperatorId;
  value: string;
};

export type ColumnSpec = {
  id: string;            // column.id
  columnKey: string;     // Prisma field name on Row (e.g. "name", "field1")
  kind: "TEXT" | "NUMBER";
};

function buildPredicate(
  c: UICondition,
  byId: Map<string, ColumnSpec>
): Prisma.RowWhereInput | null {
  if (!c.fieldId) return null;
  const spec = byId.get(c.fieldId);
  if (!spec) return null;

  const col = spec.columnKey;

  if (spec.kind === "TEXT") {
    const v = (c.value ?? "").trim();

    switch (c.op) {
      case "contains":
        if (!v) return null;
        return { [col]: { contains: v, mode: "insensitive" as const } };

      case "not_contains":
        if (!v) return null;
        return {
          OR: [
            { [col]: null },
            { NOT: { [col]: { contains: v, mode: "insensitive" as const } } },
          ],
        };

      case "eq":
        if (!v) return null;
        return { [col]: { equals: v } };

      case "empty":
        return { OR: [{ [col]: null }, { [col]: "" }] };

      case "not_empty":
        return { AND: [{ NOT: { [col]: null } }, { NOT: { [col]: "" } }] };

      default:
        return null;
    }
  }

  // NUMBER
  const num = Number(c.value);
  const ok = Number.isFinite(num);

  switch (c.op) {
    case "gt":
      if (!ok) return null;
      return { [col]: { gt: num } };
    case "lt":
      if (!ok) return null;
      return { [col]: { lt: num } };
    case "eq":
      if (!ok) return null;
      return { [col]: { equals: num } };
    case "empty":
      return { [col]: null };
    case "not_empty":
      return { NOT: { [col]: null } };
    default:
      return null;
  }
}

/**
 * Split on join==="or", AND within a group, OR across groups.
 */
export function conditionsToWhere(
  conditions: UICondition[],
  columns: ColumnSpec[]
): Prisma.RowWhereInput {
  if (!Array.isArray(conditions) || conditions.length === 0) return {};

  const byId = new Map(columns.map((c) => [c.id, c]));

  const groups: UICondition[][] = [];
  let current: UICondition[] = [];
  conditions.forEach((row, idx) => {
    if (idx === 0) {
      current = [row];
      groups.push(current);
      return;
    }
    if (row.join === "or") {
      current = [row];
      groups.push(current);
    } else {
      current.push(row);
    }
  });

  const andBlocks = groups
    .map((g): Prisma.RowWhereInput | null => {
      const preds = g
        .map((c) => buildPredicate(c, byId))
        .filter((p): p is Prisma.RowWhereInput => p != null);

      if (preds.length === 0) return null;
      if (preds.length === 1) {
        // TS fix: element access can be undefined; assert after length check
        return preds[0]!;
      }
      return { AND: preds };
    })
    .filter((b): b is Prisma.RowWhereInput => b != null);

  if (andBlocks.length === 0) return {};
  if (andBlocks.length === 1) return andBlocks[0]!;
  return { OR: andBlocks };
}
