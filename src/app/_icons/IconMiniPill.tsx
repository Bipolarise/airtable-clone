// app/_icons/IconMiniPill.tsx
import React from "react";

export function IconMiniPill({
  on,
  className = "",
  "aria-hidden": ariaHidden = true,
}: {
  on: boolean;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={
        "flex flex-none items-center rounded-full border-box " +
        (on ? "justify-end" : "justify-start") +
        (className ? ` ${className}` : "")
      }
      style={{
        height: 8,
        width: 12.8,
        padding: 2,
        borderRadius: 9999,
        backgroundColor: on ? "var(--palette-green-green, #2f7d1f)" : "#ffffff",
        border: on ? "none" : "1px solid rgb(212,212,212)",
      }}
    >
      <span
        className="flex-none"
        style={{
          width: 4,
          height: 4,
          borderRadius: 9999,
          background: "#fff",
        }}
      />
    </span>
  );
}
