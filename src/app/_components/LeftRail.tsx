"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MaskIcon from "~/app/_components/MaskIcon";
import RailBtn from "~/app/_components/RailBtn";

export default function LeftRail({
  baseName,
  baseColor = "#d4a257",
}: {
  baseName?: string | null;
  baseColor?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col items-center border-r border-neutral-200 bg-white">
      {/* Top cluster (Airtable/back + Omni) */}
      <div className="mt-2 flex flex-col items-center gap-2">
        {/* Airtable icon / Back arrow w/ animation */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded transition mt-[3px]"
          title={hover ? "Back to home" : "Airtable"}
          onClick={() => {
            router.push("/"); // change if your home route isn't "/"
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {/* Airtable logo layer */}
          <div
            className={[
              "absolute inset-0 flex items-center justify-center transition-all duration-150",
              hover
                ? "opacity-0 scale-90 translate-x-1"
                : "opacity-100 scale-100 translate-x-0",
            ].join(" ")}
          >
            <img
              src="/airtable.svg"
              alt="Airtable"
              className="h-5.5 w-5.5 opacity-90"
            />
          </div>

          {/* Arrow layer */}
          <div
            className={[
              "absolute inset-0 flex items-center justify-center transition-all duration-150",
              hover
                ? "opacity-100 translate-x-0 scale-100"
                : "opacity-0 -translate-x-1 scale-90",
            ].join(" ")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-black opacity-90 drop-shadow-[0_0_0.6px_rgba(0,0,0,0.9)]"
            >
              <path
                fillRule="nonzero"
                d="M7 3C6.8674 3.00002 6.74024 3.05271 6.64648 3.14648L2.14648 7.64648C2.05271 7.74024 2.00002 7.8674 2 8C2.00002 8.1326 2.05271 8.25976 2.14648 8.35352L6.64648 12.8535C6.74025 12.9473 6.86741 12.9999 7 12.9999C7.13259 12.9999 7.25975 12.9473 7.35352 12.8535C7.44726 12.7598 7.49992 12.6326 7.49992 12.5C7.49992 12.3674 7.44726 12.2402 7.35352 12.1465L3.70703 8.5H13.5C13.6326 8.5 13.7598 8.44732 13.8536 8.35355C13.9473 8.25979 14 8.13261 14 8C14 7.86739 13.9473 7.74021 13.8536 7.64645C13.7598 7.55268 13.6326 7.5 13.5 7.5H3.70703L7.35352 3.85352C7.44726 3.75975 7.49992 3.63259 7.49992 3.5C7.49992 3.36741 7.44726 3.24025 7.35352 3.14648C7.25976 3.05271 7.1326 3.00002 7 3Z"
              />
            </svg>
          </div>
        </button>

        {/* Omni icon button */}
        <div
          className="flex h-8 w-8 items-center justify-center select-none"
          title="Omni"
        >
          <img
            src="/omni.png"
            alt="Omni"
            className="h-7 w-7 object-contain pointer-events-none"
          />
        </div>
      </div>

      {/* User bubble bottom */}
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