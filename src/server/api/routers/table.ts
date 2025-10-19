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
        const t = await tx.table.create({
          data: { baseId: input.baseId, name: input.name },
          select: { id: true, name: true },
        });

        await tx.column.createMany({
          data: [
            { tableId: t.id, name: "Name",     type: ColumnType.TEXT,   ordinal: 0 },
            { tableId: t.id, name: "Notes",    type: ColumnType.TEXT,   ordinal: 1 },
            { tableId: t.id, name: "Assignee", type: ColumnType.TEXT,   ordinal: 2 },
            { tableId: t.id, name: "Status",   type: ColumnType.TEXT,   ordinal: 3 },
            { tableId: t.id, name: "Estimate", type: ColumnType.NUMBER, ordinal: 4 },
          ],
        });

        const cols = await tx.column.findMany({
          where: { tableId: t.id },
          orderBy: { ordinal: "asc" },
        });

        const empty = Object.fromEntries(
          cols.map((c) => [c.id, c.type === ColumnType.NUMBER ? 0 : ""])
        );
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
