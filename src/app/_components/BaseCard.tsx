"use client";

import Link from "next/link";

type Base = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  updatedAt: Date | string;
};

export default function BaseCard({ base }: { base: Base }) {
  return (
    <Link
      href={`/b/${base.id}`}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-md text-lg"
        style={{ backgroundColor: base.color ?? "#7955FF" }}
      >
        {/* yellow folder on purple tile (like Airtable) */}
        <span className="inline-block h-5 w-5 rounded-[3px] bg-[#F2C94C]" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{base.name || "Untitled Base"}</div>
        <div className="truncate text-[12px] text-neutral-500">Opened {timeAgo(base.updatedAt)}</div>
      </div>
    </Link>
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
