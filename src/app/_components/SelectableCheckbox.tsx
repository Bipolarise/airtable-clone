"use client";

import { useEffect, useRef } from "react";

type Props = {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

/** Airtable-style checkbox with proper indeterminate + focus ring */
export default function SelectableCheckbox({
  checked,
  indeterminate,
  onChange,
  className = "",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const base =
    "relative inline-flex h-5 w-5 items-center justify-center rounded-[4px] transition-colors " +
    "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)] outline-none " +
    "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#166EE1] focus-within:ring-offset-white";

  const on  = "bg-[#166EE1] ring-1 ring-[#166EE1] hover:bg-[#166EE1]";
  const off = "bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 hover:ring-neutral-400";

  return (
    <label className={["inline-flex items-center justify-center", className].join(" ")}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={[base, checked || indeterminate ? on : off].join(" ")}>
        {/* checkmark */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className={checked && !indeterminate ? "opacity-100" : "opacity-0"}
          style={{ transition: "opacity 120ms" }}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {/* indeterminate bar */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className={indeterminate && !checked ? "opacity-100 absolute" : "opacity-0 absolute"}
          style={{ transition: "opacity 120ms" }}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
    </label>
  );
}
