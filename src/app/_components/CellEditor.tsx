"use client";

import { useEffect, useState } from "react";

export default function CellEditor({
  initial,
  isNumber,
  onCommit,
  onMove,
  inputRefCb,
  allowTabOut = false,
  allowShiftTabOut = false,
}: {
  initial: string | number | "";
  isNumber: boolean;
  onCommit: (val: string | number | "") => void;
  onMove?: (
    dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab"
  ) => void;
  inputRefCb?: (el: HTMLInputElement | null) => void;

  // NEW props we added:
  allowTabOut?: boolean;        // if true, let normal Tab leave this cell naturally
  allowShiftTabOut?: boolean;   // if true, let Shift+Tab leave this cell naturally
}) {
  const [val, setVal] = useState<string>(String(initial ?? ""));

  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial]);

  const commit = () => {
    const next = isNumber ? (val === "" ? "" : Number(val)) : val;
    if (String(next) === String(initial ?? "")) return;
    onCommit(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Tab / Shift+Tab navigation
    if (e.key === "Tab") {
      const isShift = e.shiftKey;

      // Shift+Tab case
      if (isShift) {
        if (!allowShiftTabOut) {
          // we're controlling grid navigation
          e.preventDefault();
          commit();
          onMove?.("shiftTab");
        } else {
          // let browser move focus out of the grid
          commit();
        }
        return;
      }

      // Plain Tab
      if (!allowTabOut) {
        e.preventDefault();
        commit();
        onMove?.("tab");
      } else {
        commit();
      }
      return;
    }

    // Arrow / Enter keys
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      commit();
      onMove?.("left");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      commit();
      onMove?.("right");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      commit();
      onMove?.("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      commit();
      onMove?.("down");
      return;
    }
    if (e.key === "Enter") {
      commit();
    }
  };

  return (
    <input
      ref={inputRefCb}
      className="
        block
        h-[36px]
        w-full
        px-2
        text-[13px]
        outline-none
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:ring-inset
      "
      style={{
        boxSizing: "border-box", // keep focus ring hugging the box
        position: "relative",
        top: "-2px", // lift the ring up ~2px so it visually centers in the row
      }}
      type={isNumber ? "number" : "text"}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}
