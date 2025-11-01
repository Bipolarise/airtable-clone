"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import type { MouseEvent } from "react";

type Base = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  updatedAt: Date | string;
};

export default function BaseCard({ base }: { base: Base }) {
  const utils = api.useUtils();

  const del = api.base.delete.useMutation({
    // Optimistic remove from the list
    onMutate: async (vars) => {
      await utils.base.listMine.cancel();
      const prev = utils.base.listMine.getData();
      utils.base.listMine.setData(undefined, (old) =>
        (old ?? []).filter((b) => b.id !== vars.id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.base.listMine.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      void utils.base.listMine.invalidate();
    },
  });

  const onDelete = async (e: MouseEvent) => {
    e.preventDefault();          // don’t navigate
    e.stopPropagation();
    const ok = window.confirm(
      `Delete “${base.name || "Untitled Base"}”? This will remove its tables & rows.`
    );
    if (!ok) return;
    del.mutate({ id: base.id });
  };

  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
      {/* Clickable area to open the base */}
      <Link href={`/b/${base.id}`} className="block pr-16">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-md text-lg"
            style={{ backgroundColor: base.color ?? "#7955FF" }}
            aria-hidden
          >
            {/* yellow folder on purple tile (like Airtable) */}
            <span className="inline-block h-5 w-5 rounded-[3px] bg-[#F2C94C]" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium">
              {base.name || "Untitled Base"}
            </div>
            <div className="truncate text-[12px] text-neutral-500">
              Opened {timeAgo(base.updatedAt)}
            </div>
          </div>
        </div>
      </Link>

      {/* Delete button (top-right) */}
      <button
        onClick={onDelete}
        disabled={del.isPending}
        className="absolute right-3 top-3 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[12px] text-neutral-700 opacity-0 shadow-sm transition-opacity hover:bg-neutral-50 group-hover:opacity-100"
        title="Delete base"
        aria-label={`Delete ${base.name || "base"}`}
      >
        {del.isPending ? "…" : "Delete"}
      </button>
    </div>
  );
}

function timeAgo(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = (Date.now() - date.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? "s" : ""} ago`;
}

// Skeleton state
BaseCard.Skeleton = function Skeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="h-10 w-10 animate-pulse rounded-md bg-neutral-200" />
      <div className="w-full">
        <div className="h-3 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-2 h-2 w-28 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
};
