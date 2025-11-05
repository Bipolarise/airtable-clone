// src/server/api/routers/view.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/** ----- Shared schemas (keep in sync with client) ----- */
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
  fieldId: z.string().nullable(),
  op: OperatorId,
  value: z.string(),
});

const SaveInput = z.object({
  id: z.string().optional(),          // if present -> update; else -> create
  tableId: z.string(),
  name: z.string().min(1),
  filters: z.array(ConditionSchema).default([]),
  sorts: z.any().nullable().optional(),
  search: z.string().nullable().optional(),
  hiddenColumnIds: z.array(z.string()).default([]),
});

/** ----- Router ----- */
export const viewRouter = createTRPCRouter({
  /** Create or update a view */
  save: protectedProcedure.input(SaveInput).mutation(async ({ ctx, input }) => {
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

  /** List all views for a table (oldest first so “default” shows first) */
  listByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.tableView.findMany({
        where: { tableId: input.tableId },
        orderBy: { createdAt: "asc" },
      })
    ),

  /** Get a single view by id */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.tableView.findUnique({ where: { id: input.id } })
    ),

  /** Delete a view */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.tableView.delete({ where: { id: input.id } })
    ),
});

/** Optional exports if you want strong typing on the client */
export type ViewCondition = z.infer<typeof ConditionSchema>;
export type SaveViewInput = z.infer<typeof SaveInput>;
