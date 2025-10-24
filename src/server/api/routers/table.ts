import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ColumnType } from "@prisma/client";

export const tableRouter = createTRPCRouter({
  // List all tables in a base (for the dropdown / default name)
  list: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      })
    ),

  // Create a table with a default schema + some starter rows
  create: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        // 1. create table row
        const t = await tx.table.create({
          data: { baseId: input.baseId, name: input.name },
          select: { id: true, name: true },
        });

        // 2. create default columns in the order you want
        // ordinal controls left→right order you’ll get back from table.meta
        await tx.column.createMany({
          data: [
            { tableId: t.id, name: "Name",          type: ColumnType.TEXT,   ordinal: 0 },
            { tableId: t.id, name: "Notes",         type: ColumnType.TEXT,   ordinal: 1 },
            { tableId: t.id, name: "Assignee",      type: ColumnType.TEXT,   ordinal: 2 },
            { tableId: t.id, name: "Status",        type: ColumnType.TEXT,   ordinal: 3 },
            { tableId: t.id, name: "Attachments",   type: ColumnType.TEXT,   ordinal: 4 },
            { tableId: t.id, name: "Attachment...", type: ColumnType.TEXT,   ordinal: 5 },
          ],
        });

        // 3. fetch the columns we just made so we know their ids/types
        const cols = await tx.column.findMany({
          where: { tableId: t.id },
          orderBy: { ordinal: "asc" },
        });

        // 4. build an "empty row" object that satisfies each column
        const empty = Object.fromEntries(
          cols.map((c) => [
            c.id,
            c.type === ColumnType.NUMBER ? 0 : "",
          ])
        );

        // 5. seed a few starter rows using that shape
        await tx.row.createMany({
          data: [
            { tableId: t.id, data: empty },
            { tableId: t.id, data: empty },
            { tableId: t.id, data: empty },
          ],
        });

        return t;
      });
    }),

  // Column metadata for a given table
  meta: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { ordinal: "asc" },
      })
    ),
});
