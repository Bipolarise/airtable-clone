"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import type { MouseEvent } from "react";

type Base = {
  id: string;
  name: string;
  icon: string | null;   // ignored by this tile style
  color: string | null;  // preferred if present
  updatedAt: Date | string;
};

/* ---------- color helpers ---------- */
const PALETTE = [
  "#2E7D32", "#1976D2", "#8E24AA", "#F57C00",
  "#00796B", "#C2185B", "#5D4037", "#455A64",
  "#7B1FA2", "#388E3C",
];

function colorFromId(id: string) {
  const hash = Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
  return PALETTE[hash % PALETTE.length];
}

/* ---------- text helpers ---------- */
function initialsFromName(name?: string | null) {
  const n = (name ?? "").trim() || "Untitled Base";
  const firstTwo = [...n].slice(0, 2).join(""); // handles unicode properly
  // Capitalize first, keep second as-is to match “Un” look
  const [a = "", b = ""] = firstTwo;
  return (a.toUpperCase() + b.toLowerCase()) || "Un";
}

export default function BaseCard({ base }: { base: Base }) {
  const utils = api.useUtils();

  const del = api.base.delete.useMutation({
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
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete “${base.name || "Untitled Base"}”? This will remove its tables & rows.`
    );
    if (!ok) return;
    del.mutate({ id: base.id });
  };

  const tileColor = base.color ?? colorFromId(base.id);
  const initials = initialsFromName(base.name);

  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
      {/* Clickable area to open the base */}
      <Link href={`/b/${base.id}`} className="block pr-16">
        <div className="flex items-center gap-3">
          {/* Colored square with two-letter initials */}
          <span
            className="flex h-12 w-12 select-none items-center justify-center rounded-md text-[18px] font-semibold leading-none text-white"
            style={{ backgroundColor: tileColor }}
            aria-hidden
          >
            {initials}
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
  const days = Math.floor(s / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/* ---------- Skeleton ---------- */
BaseCard.Skeleton = function Skeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="h-12 w-12 animate-pulse rounded-md bg-neutral-200" />
      <div className="w-full">
        <div className="h-3 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-2 h-2 w-28 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
};
