"use client";

import Link from "next/link";
import MaskIcon from "~/app/_components/MaskIcon";

type TableTab = { id: string; name?: string | null };

export default function BaseHeaderToolbar({
  baseName,
  baseColor = "#d4a257",
  tables,
  activeTableId,
  onSwitchTable,
  onAddTable,
  isCreatingTable,
}: {
  baseName?: string | null;
  baseColor?: string;
  tables: TableTab[];
  activeTableId: string | null | undefined;
  onSwitchTable: (id: string) => void;
  onAddTable: () => void;
  isCreatingTable?: boolean;
}) {
  return (
    <>
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white">
        {/* 3-column grid: left (1fr) | center (auto) | right (1fr) */}
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-4">
          {/* LEFT: base (no back button) */}
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded"
              style={{ backgroundColor: baseColor }}
            >
              <MaskIcon
                src="/airtable.svg"
                color="white"
                className="h-5.5 w-5.5"
              />
            </span>

            <div className="flex items-center gap-1 text-[17px] font-bold text-neutral-900 leading-none">
              {baseName}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-neutral-900"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {/* CENTER: tabs — centered regardless of left/right widths */}
          <nav className="flex items-center justify-center gap-6">
            <button className="relative text-[13px] font-medium text-neutral-900">
              Data
              <div className="absolute bottom-[-18px] left-0 h-[2px] w-full bg-amber-600" />
            </button>
            <button className="text-[13px] text-neutral-500 hover:text-neutral-900">
              Automations
            </button>
            <button className="text-[13px] text-neutral-500 hover:text-neutral-900">
              Interfaces
            </button>
            <button className="text-[13px] text-neutral-500 hover:text-neutral-900">
              Forms
            </button>
          </nav>

          {/* RIGHT: actions */}
          <div className="flex items-center justify-end gap-5">
            {/* clock icon */}
            <div className="text-neutral-800">
              <svg
                width="20"
                height="20"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="text-neutral-800"
              >
                <path
                  fillRule="nonzero"
                  d="M8.13367 2.0017C6.52708 1.96745 4.93757 2.57928 3.75879 3.75902L1.63452 5.87719C1.54063 5.97081 1.48777 6.09789 1.48756 6.23048C1.48736 6.36307 1.53982 6.49031 1.63342 6.58422C1.67978 6.63073 1.73485 6.66765 1.79547 6.69287C1.8561 6.7181 1.92111 6.73114 1.98677 6.73124C2.05244 6.73134 2.11748 6.71851 2.17819 6.69347C2.23889 6.66843 2.29407 6.63168 2.34058 6.58532L4.46558 4.46654C4.46537 4.46675 4.46578 4.46634 4.46558 4.46654C5.89626 3.03469 8.04552 2.60602 9.91565 3.38024C11.7858 4.15445 13.0029 5.97586 13.0029 7.99999C13.0029 10.0241 11.7858 11.8455 9.91565 12.6197C8.04552 13.394 5.89687 12.9659 4.46619 11.534C4.41977 11.4876 4.36466 11.4507 4.30401 11.4256C4.24335 11.4004 4.17833 11.3875 4.11266 11.3875C4.047 11.3874 3.98197 11.4003 3.92129 11.4255C3.86062 11.4506 3.80548 11.4874 3.75903 11.5338C3.71258 11.5802 3.67573 11.6353 3.65057 11.696C3.62542 11.7566 3.61246 11.8217 3.61244 11.8873C3.61242 11.953 3.62533 12.018 3.65044 12.0787C3.67555 12.1394 3.71237 12.1945 3.75879 12.241C5.47337 13.9569 8.05683 14.4715 10.2981 13.5437C12.5394 12.6158 14.0029 10.4257 14.0029 7.99998C14.0029 5.57424 12.5394 3.38414 10.2981 2.45628C9.5977 2.16633 8.86394 2.01727 8.13367 2.0017Z M1.98755 3.23119C1.85494 3.23119 1.72776 3.28387 1.634 3.37764C1.54023 3.47141 1.48755 3.59858 1.48755 3.73119L1.48756 6.23048C1.48736 6.36307 1.53982 6.49031 1.63342 6.58422C1.72719 6.67799 1.85416 6.73123 1.98677 6.73124L4.48755 6.73119C4.55321 6.73119 4.61823 6.71826 4.67889 6.69313C4.73955 6.668 4.79467 6.63117 4.8411 6.58474C4.88753 6.53832 4.92436 6.4832 4.94949 6.42253C4.97462 6.36187 4.98755 6.29685 4.98755 6.23119C4.98755 6.09858 4.93487 5.97141 4.8411 5.87764C4.74733 5.78387 4.62016 5.73119 4.48755 5.73119H2.48755V3.73119C2.48755 3.59858 2.43487 3.47141 2.3411 3.37764C2.24733 3.28387 2.12016 3.23119 1.98755 3.23119Z M8 4.49999C7.86739 4.49999 7.74021 4.55267 7.64645 4.64644C7.55268 4.7402 7.5 4.86738 7.5 4.99999V7.99999C7.50721 8.02138 7.51585 8.04226 7.52588 8.06249C7.53865 8.12323 7.56262 8.18106 7.59656 8.23302C7.62459 8.28835 7.66267 8.33799 7.70886 8.37938C7.72139 8.3982 7.73517 8.41614 7.75012 8.4331L10.3501 9.9331C10.407 9.96591 10.4698 9.98721 10.5349 9.99576C10.6 10.0043 10.6661 9.99995 10.7295 9.98294C10.793 9.96593 10.8524 9.93659 10.9045 9.89659C10.9566 9.8566 11.0003 9.80675 11.0331 9.74987C11.0659 9.69299 11.0872 9.63021 11.0957 9.5651C11.1043 9.5 11.0999 9.43385 11.0829 9.37043C11.0659 9.30701 11.0366 9.24756 10.9966 9.19547C10.9566 9.14339 10.9067 9.0997 10.8499 9.06688L8.5 7.71117V4.99999C8.5 4.86738 8.44732 4.7402 8.35355 4.64644C8.25979 4.55267 8.13261 4.49999 8 4.49999Z"
                />
              </svg>
            </div>

            {/* Trial pill */}
            <div className="flex h-[32px] items-center rounded-full bg-neutral-100 px-4 text-[14px] font-medium text-neutral-800">
              Trial: 3 days left
            </div>

            {/* Launch + Share group */}
            <div className="flex items-center gap-1.5">
              {/* Launch */}
              <button className="flex h-[28px] w-[80px] items-center justify-center gap-1.5 rounded border border-neutral-300 text-[13px] text-neutral-800 hover:bg-neutral-50">
                <svg
                  className="h-[14px] w-[14px] text-neutral-700"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M13.5 2.5c.546 0 1 .454 1 1v4a.5.5 0 0 1-1 0v-4H6v9h2.5a.5.5 0 0 1 0 1h-6c-.546 0-1-.454-1-1v-9c0-.546.454-1 1-1h11Zm-11 1v9H5v-9H2.5Z M11.124 8.67a.5.5 0 0 1 .653-.086l3 2a.5.5 0 0 1 0 .832l-3 2A.5.5 0 0 1 11 13V9a.5.5 0 0 1 .124-.33Z"
                  />
                </svg>
                <span className="leading-none">Launch</span>
              </button>

              {/* Share */}
              <button className="flex h-[28px] w-[58px] items-center justify-center rounded bg-amber-600 text-[13px] font-medium text-white hover:bg-amber-700">
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-neutral-200 bg-amber-50">
        {/* h-9 = 36px tall bar */}
        <div className="flex h-9 items-center justify-between pr-4">
          {/* Left: table tabs + add */}
          <div className="flex items-center overflow-x-auto py-1 text-[13px]">
            {tables.map((t, index) => {
              const active = t.id === activeTableId;

              // first tab: square left corners AND no left border
              // others: normal rounded pill
              const radiusClass =
                index === 0
                  ? "rounded-r-md rounded-l-none border-l-0"
                  : "rounded";

              return (
                <div key={t.id} className="flex items-center">
                  <button
                    onClick={() => onSwitchTable(t.id)}
                    title={t.name ?? "Table"}
                    className={[
                      "flex items-center px-2 py-[8px] transition-colors",
                      radiusClass,
                      active
                        ? "bg-white text-neutral-900 font-medium border border-neutral-300 shadow-sm"
                        : "text-neutral-700 hover:text-neutral-900",
                    ].join(" ")}
                  >
                    <span>{t.name ?? "Table"}</span>

                    {/* caret next to active table name in Airtable style */}
                    {active && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="ml-1 text-neutral-700"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </button>

                  {/* small vertical divider after each tab EXCEPT the last one */}
                  {index !== tables.length && (
                    <div className="mx-0 h-3 w-px bg-neutral-300/70" />
                  )}
                </div>
              );
            })}

            <button
              onClick={onAddTable}
              disabled={isCreatingTable}
              className="flex items-center gap-1 rounded px-2 py-[3px] text-neutral-700 hover:text-neutral-900 disabled:opacity-60"
              title="Create a new table"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-neutral-800"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="font-medium">
                {isCreatingTable ? "Creating…" : "Add or import"}
              </span>
            </button>
          </div>

          {/* Right: Tools (only) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-[4px] rounded px-2 py-1 text-[13px] text-neutral-600 hover:text-neutral-900"
            >
              <span>Tools</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="block"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
