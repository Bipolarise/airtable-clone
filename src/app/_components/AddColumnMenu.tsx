"use client";

import { useEffect, useRef } from "react";

export default function AddColumnMenu({
  onAddText,
  onAddNumber,
  onClose,
}: {
  onAddText: () => void;
  onAddNumber: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute z-50 mt-1 w-40 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
    >
      <button
        className="block w-full cursor-pointer px-3 py-2 text-left text-[13px] text-neutral-800 hover:bg-neutral-100"
        onClick={() => {
          onAddText();
          onClose();
        }}
      >
        + Text column
      </button>
      <button
        className="block w-full cursor-pointer px-3 py-2 text-left text-[13px] text-neutral-800 hover:bg-neutral-100"
        onClick={() => {
          onAddNumber();
          onClose();
        }}
      >
        + Number column
      </button>
    </div>
  );
}
