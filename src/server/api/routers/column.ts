import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const columnRouter = createTRPCRouter({
  // Create a new column in a table
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string(), // e.g. "Field 4"
        type: z.enum(["TEXT", "NUMBER"]).default("TEXT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Find the current highest ordinal for this table
      const last = await ctx.db.column.findFirst({
        where: { tableId: input.tableId },
        orderBy: { ordinal: "desc" },
        select: { ordinal: true },
      });

      const nextOrdinal = last ? last.ordinal + 1 : 0;

      // 2. Create the new column
      const newCol = await ctx.db.column.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          hidden: false,
          ordinal: nextOrdinal,
        },
        select: {
          id: true,
          name: true,
          type: true,
          hidden: true,
          ordinal: true,
        },
      });

      return newCol;
    }),
});
