"use client";

import type { PropsWithChildren } from "react";

export default function RailBtn({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100"
      title={title}
    >
      {children}
    </button>
  );
}
