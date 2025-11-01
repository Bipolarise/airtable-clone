import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const rowRouter = createTRPCRouter({
  // --- list (infinite scroll w/ cursor + optional search) ---
  // Uses a stable tuple cursor (createdAt, id) for BOTH search and non-search paths.
  list: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(500).default(200),
        // tuple cursor keeps ordering deterministic across big datasets + search filters
        cursor: z
          .object({
            createdAt: z.string(), // ISO string
            id: z.string(),
          })
          .nullish(),
        search: z.string().optional().transform((s) => s?.trim() ?? ""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor, search } = input;
      const limitPlusOne = limit + 1;

      const afterCursorSql = cursor
        ? Prisma.sql`AND ("createdAt","id") > (${new Date(cursor.createdAt)}, ${cursor.id})`
        : Prisma.empty;

      // One SQL path for both cases; include the FTS predicate only when search is non-empty
      const rows = await ctx.db.$queryRaw<
        { id: string; tableId: string; data: any; createdAt: Date }[]
      >(
        Prisma.sql`
          SELECT "id","tableId","data","createdAt"
          FROM "Row"
          WHERE "tableId" = ${tableId}
            ${
              search
                ? Prisma.sql`AND "search_vector" @@ plainto_tsquery('simple', ${search})`
                : Prisma.empty
            }
            ${afterCursorSql}
          ORDER BY "createdAt" ASC, "id" ASC
          LIMIT ${limitPlusOne}
        `
      );

      const pageRows = rows.slice(0, limit);

      const nextCursor =
        rows.length > limit
          ? {
              createdAt: pageRows[pageRows.length - 1]!.createdAt.toISOString(),
              id: pageRows[pageRows.length - 1]!.id,
            }
          : undefined;

      // total (respecting search if provided)
      const countRes = await ctx.db.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "Row"
          WHERE "tableId" = ${tableId}
            ${
              search
                ? Prisma.sql`AND "search_vector" @@ plainto_tsquery('simple', ${search})`
                : Prisma.empty
            }
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
        columnId: z.string(),
        value: z.union([z.string(), z.number(), z.literal("")]),
        colType: z.enum(["TEXT", "NUMBER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      // trigger keeps search_vector in sync
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
          if (col.type === "TEXT") {
            obj[col.id] = faker.commerce.productName();
          } else if (col.type === "NUMBER") {
            obj[col.id] = faker.number.int({ min: 0, max: 1_000_000 });
          } else {
            obj[col.id] = "";
          }
        }
        return obj;
      };

      const BATCH_SIZE = 1000;
      const totalBatches = Math.ceil(count / BATCH_SIZE);

      for (let b = 0; b < totalBatches; b++) {
        const rowsThisBatch =
          b === totalBatches - 1 ? count - b * BATCH_SIZE : BATCH_SIZE;

        const batch: Prisma.RowCreateManyInput[] = Array.from(
          { length: rowsThisBatch },
          () => ({
            tableId,
            data: buildRowData(),
          })
        );

        await ctx.db.row.createMany({ data: batch });
      }

      return { ok: true };
    }),
});
