import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  // GET /base.listMine
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.base.findMany({
      where: { ownerId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, icon: true, color: true, updatedAt: true },
    });
  }),

  // GET /base.byId
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.base.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
        select: { id: true, name: true, icon: true, color: true, updatedAt: true },
      });
    }),

  // POST /base.create
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        icon: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.base.create({
        data: {
          name: input.name,
          icon: input.icon,
          color: input.color,
          ownerId: ctx.session.user.id,
        },
        select: { id: true, name: true, icon: true, color: true, updatedAt: true },
      });
    }),

  // DELETE /base.delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // only delete if this user owns it
      const { count } = await ctx.db.base.deleteMany({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });
      if (count === 0) {
        // optional: throw if nothing deleted
        // throw new TRPCError({ code: "NOT_FOUND", message: "Base not found" });
      }
      return { ok: true, deleted: count };
    }),
});
