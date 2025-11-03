// src/server/api/routers/view.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const OperatorId = z.enum(["contains","not_contains","eq","empty","not_empty","gt","lt"]);
const ConditionSchema = z.object({
  id: z.string(),
  join: z.union([z.literal("and"), z.literal("or")]).optional(),
  fieldId: z.string().nullable(),
  op: OperatorId,
  value: z.string(),
});

export const viewRouter = createTRPCRouter({
  save: protectedProcedure.input(z.object({
    id: z.string().optional(),
    tableId: z.string(),
    name: z.string().min(1),
    filters: z.array(ConditionSchema).default([]),
    sorts: z.any().optional(),
    search: z.string().optional(),
    hiddenColumnIds: z.array(z.string()).default([]),
  })).mutation(async ({ ctx, input }) => {
    const data = {
      tableId: input.tableId,
      name: input.name,
      filters: input.filters,
      sorts: input.sorts ?? null,
      search: input.search ?? null,
      hiddenColumnIds: input.hiddenColumnIds,
    };
    return input.id
      ? ctx.db.tableView.update({ where: { id: input.id }, data })
      : ctx.db.tableView.create({ data });
  }),

  listByTable: protectedProcedure.input(z.object({ tableId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.tableView.findMany({ where: { tableId: input.tableId }, orderBy: { createdAt: "asc" } })
    ),

  get: protectedProcedure.input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => ctx.db.tableView.findUnique({ where: { id: input.id } })),

  delete: protectedProcedure.input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.tableView.delete({ where: { id: input.id } })),
});
