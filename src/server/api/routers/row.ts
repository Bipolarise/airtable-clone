// src/server/api/routers/row.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

/* ---------- Filter UI schemas ---------- */
const OperatorId = z.enum([
  "contains",
  "not_contains",
  "eq",
  "empty",
  "not_empty",
  "gt",
  "lt",
]);

const ConditionSchema = z.object({
  id: z.string(),
  join: z.union([z.literal("and"), z.literal("or")]).optional(),
  fieldId: z.string().nullable(),             // <- JSONB key (columnId)
  op: OperatorId,
  value: z.string(),
});

type ConditionT = z.infer<typeof ConditionSchema>;

/* ---------- Helpers to build JSONB SQL predicates ---------- */
function normalizeValueForLike(v: string) {
  // escape % and _ for LIKE
  return v.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/**
 * Build a single JSONB predicate for one condition.
 * `colKind` is "TEXT" | "NUMBER" (from your Column table).
 * IMPORTANT: we parameterize the JSON key (allowed in Postgres: data->>$1).
 */
function conditionToSql(
  cond: ConditionT,
  colKind: "TEXT" | "NUMBER" = "TEXT"
): Prisma.Sql {
  const jsonKey = cond.fieldId ?? ""; // JSONB key (columnId)
  const value = (cond.value ?? "").trim();

  // ops that do not need a value
  if (cond.op === "empty") {
    return Prisma.sql`(COALESCE(data->>${jsonKey}, '') = '')`;
  }
  if (cond.op === "not_empty") {
    return Prisma.sql`(COALESCE(data->>${jsonKey}, '') <> '')`;
  }

  // value-required ops; if empty, make them no-ops so they don't hide everything
  if (!value) {
    return Prisma.sql`TRUE`;
  }

  if (colKind === "NUMBER") {
    const n = Number(value);
    // if UI somehow sent a non-number, treat as no-op instead of throwing
    if (!Number.isFinite(n)) return Prisma.sql`TRUE`;

    if (cond.op === "eq")  return Prisma.sql`((data->>${jsonKey})::numeric = ${n})`;
    if (cond.op === "gt")  return Prisma.sql`((data->>${jsonKey})::numeric > ${n})`;
    if (cond.op === "lt")  return Prisma.sql`((data->>${jsonKey})::numeric < ${n})`;
    // contains/not_contains on numbers: fall through to text compare (rare)
  }

  // TEXT (or fallback)
  if (cond.op === "eq") {
    return Prisma.sql`(data->>${jsonKey} = ${value})`;
  }
  if (cond.op === "contains") {
    const like = `%${normalizeValueForLike(value)}%`;
    return Prisma.sql`(COALESCE(data->>${jsonKey}, '') ILIKE ${like})`;
  }
  if (cond.op === "not_contains") {
    const like = `%${normalizeValueForLike(value)}%`;
    return Prisma.sql`(COALESCE(data->>${jsonKey}, '') NOT ILIKE ${like})`;
  }

  return Prisma.sql`TRUE`;
}

/**
 * Turn the flat condition list into a single SQL fragment:
 *   AND ( pred0 [AND|OR] pred1 [AND|OR] pred2 ... )
 * - Skips rows with no fieldId
 * - Skips value-required ops when value is empty
 * - Uses column kinds from `colKinds` map (columnId -> "TEXT" | "NUMBER")
 */
function compileFiltersSql(
  conditions: ConditionT[],
  colKinds: Record<string, "TEXT" | "NUMBER">
): Prisma.Sql {
  // keep only usable rows (has field; value present if needed)
  const usable = conditions.filter((c) => {
    if (!c.fieldId) return false;
    if (c.op === "empty" || c.op === "not_empty") return true;
    return (c.value ?? "").trim().length > 0;
  });

  if (usable.length === 0) return Prisma.empty;

  const parts: Prisma.Sql[] = [];

  usable.forEach((c, i) => {
    // add the boolean join token before every predicate after the first
    if (i > 0) {
      const j = (c.join ?? "and").toUpperCase(); // "AND" | "OR"
      parts.push(Prisma.sql` ${Prisma.raw(j)} `);
    }
    const kind = colKinds[c.fieldId!] ?? "TEXT";
    parts.push(conditionToSql(c, kind));
  });

  // IMPORTANT: do NOT use Prisma.join here (it adds commas).
  // Concatenate the SQL fragments with spaces.
  const combined = parts.reduce<Prisma.Sql>(
    (acc, piece) => (acc === Prisma.empty ? piece : Prisma.sql`${acc} ${piece}`),
    Prisma.empty
  );

  // Wrap in a single AND (...) so it composes with other WHERE pieces
  return Prisma.sql`AND (${combined})`;
}

export const rowRouter = createTRPCRouter({
  // --- list (infinite scroll w/ cursor + optional search + filters) ---
  list: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(500).default(200),
        cursor: z
          .object({
            createdAt: z.string(), // ISO string
            id: z.string(),
          })
          .nullish(),
        search: z.string().optional().transform((s) => s?.trim() ?? ""),
        conditions: z.array(ConditionSchema).default([]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor, search, conditions } = input;
      const limitPlusOne = limit + 1;

      // Load column kinds so we know which JSONB keys are numbers
      const columns = await ctx.db.column.findMany({
        where: { tableId },
        select: { id: true, type: true },
      });
      const colKinds: Record<string, "TEXT" | "NUMBER"> = Object.fromEntries(
        columns.map((c) => [c.id, c.type as "TEXT" | "NUMBER"])
      );

      // keyset pagination tuple
      const afterTuple = cursor
        ? Prisma.sql`AND ("createdAt","id") > (${new Date(cursor.createdAt)}, ${cursor.id})`
        : Prisma.empty;

      // AND/OR filters from the UI
      const filtersSql = compileFiltersSql(conditions, colKinds);

      // optional full-text search on your tsvector column (comment out if you don't have it)
      const searchSql =
        search && search.length > 0
          ? Prisma.sql`AND "search_vector" @@ plainto_tsquery('simple', ${search})`
          : Prisma.empty;

      const rows = await ctx.db.$queryRaw<
        { id: string; tableId: string; data: any; createdAt: Date }[]
      >(Prisma.sql`
        SELECT "id","tableId","data","createdAt"
        FROM "Row"
        WHERE "tableId" = ${tableId}
          ${searchSql}
          ${filtersSql}
          ${afterTuple}
        ORDER BY "createdAt" ASC, "id" ASC
        LIMIT ${limitPlusOne}
      `);

      const pageRows = rows.slice(0, limit);

      const nextCursor =
        rows.length > limit
          ? {
              createdAt: pageRows[pageRows.length - 1]!.createdAt.toISOString(),
              id: pageRows[pageRows.length - 1]!.id,
            }
          : undefined;

      // same filters for total count
      const countRes = await ctx.db.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "Row"
          WHERE "tableId" = ${tableId}
            ${searchSql}
            ${filtersSql}
        `
      );
      const total = Number(countRes[0]?.count ?? 0n);

      return { rows: pageRows, nextCursor, total };
    }),

  // --- create (single row add) ---
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        data: z.record(z.union([z.string(), z.number(), z.literal("")])),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.row.create({
        data: { tableId: input.tableId, data: input.data as any },
      });
      return row;
    }),

  // --- updateCell (in-place JSONB set) ---
  updateCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(), // JSONB key
        value: z.union([z.string(), z.number(), z.literal("")]),
        colType: z.enum(["TEXT", "NUMBER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Parameterized & type-preserving JSONB update
      await ctx.db.$executeRawUnsafe(
        `
        UPDATE "Row"
        SET data = jsonb_set(
          data,
          ($1)::text[],
          CASE
            WHEN $4 = 'NUMBER' AND $2 <> '' THEN to_jsonb(($2)::numeric)
            ELSE to_jsonb(($2)::text)
          END,
          true
        )
        WHERE id = $3
        `,
        `{${input.columnId}}`,
        String(input.value ?? ""),
        input.rowId,
        input.colType
      );
      return { ok: true };
    }),

  // --- bulkAddDemo (100k rows button) ---
  bulkAddDemo: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        count: z.number().min(1).max(100_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, count } = input;

      const columns = await ctx.db.column.findMany({
        where: { tableId },
        orderBy: { ordinal: "asc" },
      });

      if (columns.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Table has no columns, cannot generate demo rows.",
        });
      }

      const buildRowData = (): Record<string, string | number | ""> => {
        const obj: Record<string, string | number | ""> = {};
        for (const col of columns) {
          if (col.type === "TEXT") obj[col.id] = faker.commerce.productName();
          else if (col.type === "NUMBER") obj[col.id] = faker.number.int({ min: 0, max: 1_000_000 });
          else obj[col.id] = "";
        }
        return obj;
      };

      const BATCH_SIZE = 1000;
      const totalBatches = Math.ceil(count / BATCH_SIZE);

      for (let b = 0; b < totalBatches; b++) {
        const rowsThisBatch =
          b === totalBatches - 1 ? count - b * BATCH_SIZE : BATCH_SIZE;

        const batch: Prisma.RowCreateManyInput[] = Array.from({ length: rowsThisBatch }, () => ({
          tableId,
          data: buildRowData(),
        }));

        await ctx.db.row.createMany({ data: batch });
      }

      return { ok: true };
    }),
});
