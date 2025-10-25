"use client";

import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";

export type CellEditorHandle = {
  commitNow: () => void;
  getValue: () => string | number | "";
};

type Props = {
  initial: string | number | "";
  isNumber: boolean;
  onCommit: (val: string | number | "") => void;
  onMove?: (
    dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab"
  ) => void;
  inputRefCb?: (el: HTMLInputElement | null) => void;
  allowTabOut?: boolean;
  allowShiftTabOut?: boolean;
};

const CellEditor = forwardRef<CellEditorHandle, Props>(function CellEditor(
  {
    initial,
    isNumber,
    onCommit,
    onMove,
    inputRefCb,
    allowTabOut = false,
    allowShiftTabOut = false,
  },
  ref
) {
  // local draft state
  const [val, setVal] = useState<string>(String(initial ?? ""));

  // sync with parent when parent value changes (optimistic updates etc)
  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial]);

  // final typed value
  const buildFinalVal = () => {
    return isNumber ? (val === "" ? "" : Number(val)) : val;
  };

  // call onCommit if changed
  const commitIfChanged = () => {
    const next = buildFinalVal();
    if (String(next) !== String(initial ?? "")) {
      onCommit(next);
    }
  };

  // expose imperative API if parent ever needs it
  useImperativeHandle(ref, () => ({
    commitNow: commitIfChanged,
    getValue: buildFinalVal,
  }));

  // keyboard nav
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      const isShift = e.shiftKey;

      if (isShift) {
        if (!allowShiftTabOut) {
          e.preventDefault();
          commitIfChanged();
          onMove?.("shiftTab");
        } else {
          commitIfChanged();
        }
        return;
      }

      if (!allowTabOut) {
        e.preventDefault();
        commitIfChanged();
        onMove?.("tab");
      } else {
        commitIfChanged();
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      commitIfChanged();
      onMove?.("left");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      commitIfChanged();
      onMove?.("right");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      commitIfChanged();
      onMove?.("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      commitIfChanged();
      onMove?.("down");
      return;
    }
    if (e.key === "Enter") {
      commitIfChanged();
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
        boxSizing: "border-box",
        position: "relative",
        top: "-2px",
      }}
      type={isNumber ? "number" : "text"}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commitIfChanged} // commit when you LEAVE the cell
      onKeyDown={onKeyDown}
    />
  );
});

export default CellEditor;
