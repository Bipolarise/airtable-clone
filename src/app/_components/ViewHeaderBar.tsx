"use client";

import { IconEyeSlash } from "~/app/_icons/IconEyeSlash";
import { IconFunnelSimple } from "~/app/_icons/IconFunnelSimple";
import { IconGroup } from "~/app/_icons/IconGroup";
import { IconArrowsDownUp } from "~/app/_icons/IconArrowsDownUp";
import { IconPaintBucket } from "~/app/_icons/IconPaintBucket";
import { IconRowHeightSmall } from "~/app/_icons/IconRowHeightSmall";
import { IconArrowSquareOut } from "~/app/_icons/IconArrowSquareOut";
import { IconGridFeature } from "~/app/_icons/IconGridFeature";

type ViewHeaderBarProps = {
  onAddDemoRows: () => void;
  isAddingDemoRows: boolean;
};

export default function ViewHeaderBar({
  onAddDemoRows,
  isAddingDemoRows,
}: ViewHeaderBarProps) {
  return (
    <div className="border-b border-neutral-200 bg-white">
      {/* h-12 = 48px tall */}
      <div className="flex h-12 items-center justify-between px-4 text-[13px] text-neutral-700">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3">
          {/* current view selector */}
          <button className="flex items-center gap-2 rounded px-1.5 hover:bg-neutral-100">
            {/* grid feature icon, now blue */}
            <IconGridFeature className="h-4 w-4 text-[#166ee1]" />

            <span className="font-medium text-neutral-800">Grid view</span>

            {/* chevron down */}
            <svg
              className="text-neutral-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-neutral-700">
          {/* +100k rows button (demo data) */}
          <button
            onClick={onAddDemoRows}
            disabled={isAddingDemoRows}
            className={[
              "flex items-center gap-1 rounded px-1.5 transition-colors",
              "hover:bg-neutral-100 active:bg-neutral-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "text-neutral-700",
            ].join(" ")}
            title="Insert demo rows"
          >
            {/* magic wand icon */}
            <svg
              className="text-neutral-600"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* wand handle */}
              <rect x="14" y="2" width="4" height="4" />
              <path d="M4 20 L20 4" />
              {/* sparkles */}
              <line x1="2" y1="11" x2="6" y2="11" />
              <line x1="4" y1="9" x2="4" y2="13" />
              <line x1="18" y1="15" x2="22" y2="15" />
              <line x1="20" y1="13" x2="20" y2="17" />
              <line x1="9" y1="2" x2="9" y2="6" />
              <line x1="7" y1="4" x2="11" y2="4" />
            </svg>

            <span className="whitespace-nowrap">
              {isAddingDemoRows ? "Adding…" : "+100k rows"}
            </span>
          </button>

          {/* Hide fields */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconEyeSlash className="h-[14px] w-[14px] text-neutral-600" />
            <span>Hide fields</span>
          </button>

          {/* Filter */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconFunnelSimple className="h-[14px] w-[14px] text-neutral-600" />
            <span>Filter</span>
          </button>

          {/* Group */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconGroup className="h-[14px] w-[14px] text-neutral-600" />
            <span>Group</span>
          </button>

          {/* Sort */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconArrowsDownUp className="h-[14px] w-[14px] text-neutral-600" />
            <span>Sort</span>
          </button>

          {/* Color */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconPaintBucket className="h-[14px] w-[14px] text-neutral-600" />
            <span>Color</span>
          </button>

          {/* Row height */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconRowHeightSmall className="h-[14px] w-[14px] text-neutral-600" />
          </button>

          {/* Share and sync */}
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100">
            <IconArrowSquareOut className="h-[14px] w-[14px] text-neutral-600" />
            <span>Share and sync</span>
          </button>

          {/* Search */}
          <button className="flex items-center rounded px-1.5 hover:bg-neutral-100">
            <svg
              className="text-neutral-600"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
