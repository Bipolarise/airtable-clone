import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { faker } from "@faker-js/faker";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const rowRouter = createTRPCRouter({
  // --- list (infinite scroll w/ cursor) ---
  list: protectedProcedure
  .input(
    z.object({
      tableId: z.string(),
      limit: z.number().min(1).max(500).default(200),
      cursor: z.object({ id: z.string() }).nullish(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { tableId, limit, cursor } = input;

    const rows = await ctx.db.row.findMany({
      where: { tableId },
      orderBy: { id: "asc" }, // ✅ single stable sort key
      take: limit + 1,
      cursor: cursor ? { id: cursor.id } : undefined,
      skip: cursor ? 1 : 0,
    });

    let nextCursor: { id: string } | undefined;
    if (rows.length > limit) {
      const next = rows.pop()!;
      nextCursor = { id: next.id };
    }

    const total = await ctx.db.row.count({
      where: { tableId },
    });

    return { rows, nextCursor, total };
  }),


  // --- create (single row add) ---
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        data: z.record(
          z.union([z.string(), z.number(), z.literal("")])
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
          data: input.data as any,
        },
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
      // We write directly into Row.data jsonb using jsonb_set.
      // If NUMBER and value != "" we cast to numeric in SQL so it stays a number in JSON.
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

  // --- bulkAddDemo (NEW) ---
  // This is the 100k rows button.
  // Call with { tableId, count: 100_000 }.
  bulkAddDemo: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        count: z.number().min(1).max(100_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, count } = input;

      // 1. Fetch all columns for this table so we know what keys to generate.
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

      // 2. Helper to build the Row.data JSON for one row
      const buildRowData = (): Record<string, string | number | ""> => {
        const obj: Record<string, string | number | ""> = {};
        for (const col of columns) {
          // match your ColumnType enum in Prisma (TEXT | NUMBER)
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

      // 3. Insert in batches so we don't do 100k single inserts
      const BATCH_SIZE = 1000;
      const totalBatches = Math.ceil(count / BATCH_SIZE);

      for (let b = 0; b < totalBatches; b++) {
        const rowsThisBatch =
          b === totalBatches - 1
            ? count - b * BATCH_SIZE
            : BATCH_SIZE;

        // build a batch of rows
        const batch: Prisma.RowCreateManyInput[] = Array.from(
          { length: rowsThisBatch },
          () => ({
            tableId,
            data: buildRowData(),
          })
        );

        // createMany is much faster than .create() in a loop
        await ctx.db.row.createMany({
          data: batch,
        });
      }

      return { ok: true };
    }),
});
