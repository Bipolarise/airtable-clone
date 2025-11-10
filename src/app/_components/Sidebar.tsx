// src/app/_components/Sidebar.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

// ICONS (same set you already use)
import { IconHouse } from "~/app/_icons/IconHouse";
import { IconStar } from "~/app/_icons/IconStar";
import { IconShare } from "~/app/_icons/IconShare";
import { IconUsersThree } from "~/app/_icons/IconUsersThree";
import { IconBookOpen } from "~/app/_icons/IconBookOpen";
import { IconShoppingBagOpen } from "~/app/_icons/IconShoppingBagOpen";
import { IconUploadSimple } from "~/app/_icons/IconUploadSimple";

export default function Sidebar({ showBrand = false }: { showBrand?: boolean }) {
  const router = useRouter();
  const utils = api.useUtils();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { mutateAsync: createBase, isPending } = api.base.create.useMutation({
    onSuccess: async (base) => {
      await utils.base.listMine.invalidate();
      router.push(`/b/${base.id}`);
    },
  });

  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);

  const handleConfirmCreate = useCallback(
    async (rawName?: string) => {
      const name = (rawName ?? "").trim() || "Untitled Base";
      await createBase({ name });
      setIsCreateOpen(false);
    },
    [createBase]
  );

  return (
    <aside
      className="
        w-[240px] border-r border-neutral-200 bg-white
        min-h-0 h[calc(100dvh-56px)] md:h-[calc(100dvh-56px)]
        flex flex-col justify-between
      "
    >
      {/* (optional) Brand row */}
      {showBrand && (
        <div className="flex h-12 items-center gap-3 border-b border-neutral-200 px-3">
          <button className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Image src="/airtable-favicon.ico" alt="Airtable" width={20} height={20} />
          <span className="text-[15px] font-semibold">Airtable</span>
        </div>
      )}

      {/* Top section (nav) */}
      <nav className="select-none p-2 text-[13px]">
        <NavItem icon={<IconHouse />} label="Home" active />
        <Section
          label="Starred"
          icon={<IconStar />}
          helper="Your starred bases, interfaces, and workspaces will appear here"
        />
        <Section label="Shared" icon={<IconShare />} />
        <Section label="Workspaces" icon={<IconUsersThree />}>
          <button className="ml-auto rounded px-1.5 text-neutral-500 hover:bg-neutral-100">+</button>
        </Section>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-neutral-200 p-3">
        <div className="space-y-2 px-1 text-[12px] text-neutral-600">
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-neutral-50">
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <IconBookOpen />
            </span>
            Templates and apps
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-neutral-50">
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <IconShoppingBagOpen />
            </span>
            Marketplace
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-neutral-50">
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <IconUploadSimple />
            </span>
            Import
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-neutral-200">
          <button
            onClick={openCreate}
            disabled={isPending}
            className="flex w-full items-center justify-center rounded-lg bg-[#4169ff] px-3 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
            title="Create a new base"
          >
            {isPending ? "Creating…" : "+ Create"}
          </button>
        </div>
      </div>

      {isCreateOpen && (
        <CreateBaseModal
          isPending={isPending}
          onCancel={closeCreate}
          onConfirm={handleConfirmCreate}
        />
      )}
    </aside>
  );
}

/* ----------------------------- modal component ----------------------------- */

function CreateBaseModal({
  isPending,
  onCancel,
  onConfirm,
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (name?: string) => void;
}) {
  const [name, setName] = useState("Untitled Base");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofocus the input when the modal mounts
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on ESC, submit on CMD/CTRL+Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onConfirm(name);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, onCancel, onConfirm]);

  const body = (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[1000] flex items-center justify-center"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* dialog */}
      <div className="relative z-10 w-[min(92vw,520px)] rounded-2xl bg-white p-4 shadow-xl">
        <h2 className="px-1 text-[15px] font-semibold">Create base</h2>

        <div className="mt-3 space-y-2 px-1">
          <label htmlFor="baseName" className="text-[12px] text-neutral-600">
            Name
          </label>
          <input
            id="baseName"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(name);
            }}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-[14px] outline-none focus:border-[#4169ff]"
            placeholder="Untitled Base"
            disabled={isPending}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2 px-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(name)}
            disabled={isPending}
            className="rounded-md bg-[#4169ff] px-3 py-2 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create base"}
          </button>
        </div>
      </div>
    </div>
  );

  // portal so it sits above any stacking contexts
  return createPortal(body, document.body);
}

/* ------------------------------- helpers ---------------------------------- */

function NavItem({
  label,
  icon,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "flex h-9 items-center gap-2 rounded-md px-2",
        active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      {label}
    </div>
  );
}

function Section({
  label,
  icon,
  helper,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  helper?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex h-9 items-center gap-2 rounded-md px-2 text-neutral-700 hover:bg-neutral-50">
        <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
        <span>{label}</span>
        {children}
      </div>
      {helper && (
        <div className="mx-2 mt-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-[12px] leading-5 text-neutral-600">
          {helper}
        </div>
      )}
    </div>
  );
}
