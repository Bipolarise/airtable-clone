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
  },
  ref
) {
  // local draft state
  const [val, setVal] = useState<string>(String(initial ?? ""));
  
  // Track if we're navigating via keyboard to prevent blur interference
  const isNavigatingRef = useRef(false);
  const hasCommittedRef = useRef(false);
  const lastCommittedValueRef = useRef<string>("");

  // Track if this is a fresh mount after navigation
  const isFirstMountRef = useRef(true);
  const prevInitialRef = useRef(initial);

  // sync with parent when parent value changes (optimistic updates etc)
  useEffect(() => {
    const initialStr = String(initial ?? "");
    const prevInitialStr = String(prevInitialRef.current ?? "");
    
    // DON'T update local state if this input currently has focus (user is typing)
    const hasFocus = inputRef.current && document.activeElement === inputRef.current;
    if (hasFocus) {
      // Still update refs for next time
      prevInitialRef.current = initial;
      return;
    }
    
    // Detect if this is a new cell being focused (initial changed from non-empty to different value)
    if (!isFirstMountRef.current && initialStr !== prevInitialStr && initialStr !== lastCommittedValueRef.current) {
      shouldAutoFocusRef.current = true;
    }
    
    prevInitialRef.current = initial;
    isFirstMountRef.current = false;
    
    // Only update if the initial value is different from what we just committed
    // This prevents overwriting during navigation
    if (initialStr !== lastCommittedValueRef.current || !isNavigatingRef.current) {
      setVal(initialStr);
      if (!isNavigatingRef.current) {
        hasCommittedRef.current = false;
      }
    }
  }, [initial]);

  // final typed value
  const buildFinalVal = () => {
    return isNumber ? (val === "" ? "" : Number(val)) : val;
  };

  // Debounce timer for commits while typing
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // call onCommit if changed
  const commitIfChanged = () => {
    const next = buildFinalVal();
    const nextStr = String(next);
    if (nextStr !== String(initial ?? "")) {
      hasCommittedRef.current = true;
      lastCommittedValueRef.current = nextStr;
      setVal(nextStr); // Update local state immediately
      onCommit(next);
    }
  };
  
  // Auto-focus on mount if needed
  useEffect(() => {
    if (shouldAutoFocus && inputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (inputRef.current && document.body.contains(inputRef.current)) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoFocus]);

  // Cleanup on unmount
  useEffect(() => {
    const timer = commitTimerRef.current;
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  // expose imperative API
  useImperativeHandle(ref, () => ({
    commitNow: commitIfChanged,
    getValue: buildFinalVal,
  }));

  // Handle navigation with synchronized commit
  const handleNavigation = (dir: "left" | "right" | "up" | "down" | "tab" | "shiftTab") => {
    const finalVal = buildFinalVal();
    const finalValStr = String(finalVal);
    const hasChanged = finalValStr !== String(initial ?? "");
    
    // Mark navigation before commit to prevent blur from firing
    isNavigatingRef.current = true;
    
    // Commit if value changed
    if (hasChanged && !hasCommittedRef.current) {
      hasCommittedRef.current = true;
      lastCommittedValueRef.current = finalValStr;
      
      // Update local state immediately to prevent flicker
      setVal(finalValStr);
      
      // Commit the value
      onCommit(finalVal);
    }
    
    // ALWAYS move to the next cell, regardless of whether we committed
    // Move immediately to ensure navigation happens
    onMove?.(dir);
    
    // Reset navigation flag after a longer delay to ensure focus has settled
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  // keyboard nav
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
        return;
      }

      if (!allowTabOut) {
        e.preventDefault();
        handleNavigation("tab");
      } else {
        commitIfChanged();
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

  // Handle blur - only commit if we're not in the middle of keyboard navigation
  const handleBlur = () => {
    // Don't commit on blur if we're navigating via keyboard
    // The keyboard handler already committed the value
    if (isNavigatingRef.current) {
      return;
    }
    
    // Also check if we've already committed (prevents double commit)
    if (!hasCommittedRef.current) {
      commitIfChanged();
    }
  };

  // Reset navigation flag when a cell gains focus
  const handleFocus = () => {
    // Reset flags when cell gains focus from a completed navigation
    isNavigatingRef.current = false;
    hasCommittedRef.current = false;
    // Clear the last committed value so future optimistic updates work normally
    lastCommittedValueRef.current = "";
  };
  
  // Keep focus when component updates during navigation
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldAutoFocusRef = useRef(false);

  // Combined ref callback - auto-focus when element mounts if needed
  const handleInputRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (inputRefCb) {
      inputRefCb(el);
    }
    
    // If this element just mounted and we need to auto-focus
    if (el && shouldAutoFocusRef.current) {
      // Use setTimeout to ensure the element is fully in the DOM
      setTimeout(() => {
        if (el && document.body.contains(el)) {
          el.focus();
          el.select();
          shouldAutoFocusRef.current = false;
        }
      }, 0);
    }
  };

  return (
    <input
      ref={handleInputRef}
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
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      tabIndex={0}
      autoComplete="off"
    />
  );
});

// Memoize with custom comparison to prevent unnecessary re-renders
const CellEditor = React.memo(CellEditorInner, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  // If the input has focus, DON'T re-render even if initial changes
  const prevInitialStr = String(prevProps.initial ?? "");
  const nextInitialStr = String(nextProps.initial ?? "");
  
  // If initial value didn't change, don't re-render
  if (prevInitialStr === nextInitialStr) {
    return true; // props are equal, skip re-render
  }
  
  // If only initial changed but it's the same as what we're displaying, skip re-render
  // This prevents flickering when mutations update the initial value
  return false; // props changed, allow re-render
});

export default CellEditor;
