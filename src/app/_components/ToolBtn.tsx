"use client";

import type { PropsWithChildren } from "react";

export default function ToolBtn({ children }: PropsWithChildren) {
  return (
    <button className="rounded px-2 py-1 text-[12px] text-neutral-600 hover:bg-amber-100">
      {children}
    </button>
  );
}
