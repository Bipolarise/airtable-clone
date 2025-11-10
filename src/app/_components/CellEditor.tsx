"use client";

import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
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
  shouldAutoFocus?: boolean;

  /** New: stable identity of the cell, e.g. `${rowId}:${colId}` */
  identityKey: string;
};

const CellEditorInner = forwardRef<CellEditorHandle, Props>(function CellEditor(
  {
    initial,
    isNumber,
    onCommit,
    onMove,
    inputRefCb,
    allowTabOut = false,
    allowShiftTabOut = false,
    shouldAutoFocus = false,
    identityKey,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // local draft state
  const [val, setVal] = useState<string>(String(initial ?? ""));

  // navigation / commit state
  const isNavigatingRef = useRef(false);
  const hasCommittedRef = useRef(false);
  const lastCommittedValueRef = useRef<string>("");

  // When the *cell identity* changes, reset local value from `initial`
  const lastIdentityRef = useRef(identityKey);
  useEffect(() => {
    if (lastIdentityRef.current !== identityKey) {
      lastIdentityRef.current = identityKey;
      setVal(String(initial ?? ""));
      hasCommittedRef.current = false;
      lastCommittedValueRef.current = "";
    }
  }, [identityKey, initial]);

  // If parent updates `initial` while we’re NOT focused (optimistic/server echo)
  useEffect(() => {
    const hasFocus =
      inputRef.current && document.activeElement === inputRef.current;
    if (!hasFocus) {
      setVal(String(initial ?? ""));
    }
  }, [initial]);

  // hand back the ref
  useEffect(() => {
    inputRefCb?.(inputRef.current);
    return () => inputRefCb?.(null);
  }, [inputRefCb]);

  // autofocus without remounting
  useEffect(() => {
    if (shouldAutoFocus && inputRef.current) {
      try {
        inputRef.current.focus({ preventScroll: true });
        inputRef.current.select();
      } catch {}
    }
  }, [shouldAutoFocus, identityKey]);

  const buildFinalVal = () => {
    return isNumber ? (val === "" ? "" : Number(val)) : val;
  };

  const commitIfChanged = () => {
    const next = buildFinalVal();
    const nextStr = String(next);
    if (nextStr !== String(initial ?? "")) {
      hasCommittedRef.current = true;
      lastCommittedValueRef.current = nextStr;
      setVal(nextStr);
      onCommit(next);
    }
  };

  useImperativeHandle(ref, () => ({
    commitNow: commitIfChanged,
    getValue: buildFinalVal,
  }));

  const handleNavigation = (
    dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab"
  ) => {
    const finalVal = buildFinalVal();
    const finalStr = String(finalVal);
    const changed = finalStr !== String(initial ?? "");

    isNavigatingRef.current = true;

    if (changed && !hasCommittedRef.current) {
      hasCommittedRef.current = true;
      lastCommittedValueRef.current = finalStr;
      setVal(finalStr);
      onCommit(finalVal);
    }

    onMove?.(dir);

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 250);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      const isShift = e.shiftKey;
      if (isShift) {
        if (!allowShiftTabOut) {
          e.preventDefault();
          handleNavigation("shiftTab");
        } else {
          commitIfChanged();
        }
      } else {
        if (!allowTabOut) {
          e.preventDefault();
          handleNavigation("tab");
        } else {
          commitIfChanged();
        }
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleNavigation("left");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNavigation("right");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleNavigation("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleNavigation("down");
      return;
    }
    if (e.key === "Enter") {
      commitIfChanged();
    }
  };

  const handleBlur = () => {
    if (isNavigatingRef.current) return;
    if (!hasCommittedRef.current) commitIfChanged();
  };

  const handleFocus = () => {
    isNavigatingRef.current = false;
    hasCommittedRef.current = false;
    // don’t clear lastCommittedValueRef here; it’s used to avoid echo jitter
  };

  return (
    <input
      ref={inputRef}
      className="
        block h-[36px] w-full px-2 text-[13px]
        outline-none focus:outline-none
        focus:ring-2 focus:ring-blue-500 focus:ring-inset
      "
      style={{ boxSizing: "border-box", position: "relative", top: "-2px" }}
      // Important: keep as text to avoid number-input focus/caret glitches
      type="text"
      inputMode={isNumber ? "decimal" : "text"}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      tabIndex={0}
      autoComplete="off"
    />
  );
});

// No React.memo — identityKey-driven state keeps renders cheap and correct
const CellEditor = CellEditorInner;

export default CellEditor;
