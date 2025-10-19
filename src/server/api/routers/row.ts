import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const rowRouter = createTRPCRouter({
  // --- list (unchanged) ---
  list: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(500).default(200),
        cursor: z.object({ id: z.string() }).nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor.id } : undefined,
        skip: input.cursor ? 1 : 0,
      });

      let nextCursor: { id: string } | undefined;
      if (rows.length > input.limit) {
        const next = rows.pop()!;
        nextCursor = { id: next.id };
      }
      const total = await ctx.db.row.count({ where: { tableId: input.tableId } });
      return { rows, nextCursor, total };
    }),

  // --- create (NEW) ---
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        // each cell is stored as string or "" (you can allow numbers too if you prefer)
        data: z.record(z.union([z.string(), z.number(), z.literal("")])),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
          // if your schema has default {}, this is still fine
          data: input.data as any,
        },
      });
      return row;
    }),

  // --- updateCell (fixed) ---
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
      // IMPORTANT: ($1)::text[] for the jsonb_set path
      // Write numbers as numeric json when colType is NUMBER & not empty, else as text
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
});
