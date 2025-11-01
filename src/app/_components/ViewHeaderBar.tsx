// src/app/_components/ViewHeaderBar.tsx
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
  // we still keep search state in the page (modal will edit it)
  search: string;
  onOpenSearchModal: () => void;
};

export default function ViewHeaderBar({
  onAddDemoRows,
  isAddingDemoRows,
  search,
  onOpenSearchModal,
}: ViewHeaderBarProps) {
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="flex h-12 items-center justify-between px-4 text-[13px] text-neutral-700">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded px-1.5 hover:bg-neutral-100">
            <IconGridFeature className="h-4 w-4 text-[#166ee1]" />
            <span className="font-medium text-neutral-800">Grid view</span>
            <svg className="text-neutral-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* RIGHT */}
        <div className="relative flex flex-wrap items-center gap-3 text-[12px] text-neutral-700">
          <button
            onClick={onAddDemoRows}
            disabled={isAddingDemoRows}
            className="flex items-center gap-1 rounded px-1.5 transition-colors hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            title="Insert demo rows"
          >
            <svg className="text-neutral-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="14" y="2" width="4" height="4" />
              <path d="M4 20 L20 4" />
              <line x1="2" y1="11" x2="6" y2="11" />
              <line x1="4" y1="9" x2="4" y2="13" />
              <line x1="18" y1="15" x2="22" y2="15" />
              <line x1="20" y1="13" x2="20" y2="17" />
              <line x1="9" y1="2" x2="9" y2="6" />
              <line x1="7" y1="4" x2="11" y2="4" />
            </svg>
            <span className="whitespace-nowrap">{isAddingDemoRows ? "Adding…" : "+100k rows"}</span>
          </button>

          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconEyeSlash className="h-[14px] w-[14px] text-neutral-600" /><span>Hide fields</span></button>
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconFunnelSimple className="h-[14px] w-[14px] text-neutral-600" /><span>Filter</span></button>
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconGroup className="h-[14px] w-[14px] text-neutral-600" /><span>Group</span></button>
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconArrowsDownUp className="h-[14px] w-[14px] text-neutral-600" /><span>Sort</span></button>
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconPaintBucket className="h-[14px] w-[14px] text-neutral-600" /><span>Color</span></button>
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconRowHeightSmall className="h-[14px] w-[14px] text-neutral-600" /></button>
          <button className="flex items-center gap-1 rounded px-1.5 hover:bg-neutral-100"><IconArrowSquareOut className="h-[14px] w-[14px] text-neutral-600" /><span>Share and sync</span></button>

          {/* Search icon -> opens modal */}
          <button
            onClick={onOpenSearchModal}
            className="flex items-center rounded px-1.5 hover:bg-neutral-100"
            aria-label="Open search"
            title={search ? `Search: ${search}` : "Search"}
          >
            <svg className="text-neutral-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
