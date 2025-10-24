"use client";

import MaskIcon from "~/app/_components/MaskIcon";
import RailBtn from "~/app/_components/RailBtn";

export default function LeftRail({
  baseName,
  baseColor = "#d4a257",
}: {
  baseName?: string | null;
  baseColor?: string;
}) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col items-center border-r border-neutral-200 bg-white">
      <div className="mt-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100"
          title="Airtable"
        >
          <img src="/airtable.svg" alt="Airtable" className="h-5 w-5 opacity-90" />
        </button>
      </div>

      <div className="mt-4 h-3.5 w-3.5 rounded-full border border-neutral-300" />

      <div className="mt-4 flex flex-col gap-1.5">
        <RailBtn title="Home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12l9-9 9 9" />
            <path d="M9 21V9h6v12" />
          </svg>
        </RailBtn>
        <RailBtn title="Bases">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </RailBtn>
      </div>

      <div className="mt-auto mb-3">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-[12px] font-medium text-white"
          title="Account"
        >
          {(baseName?.[0] ?? "U").toUpperCase()}
        </button>
      </div>
    </aside>
  );
}
