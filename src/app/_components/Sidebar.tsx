"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

// ICONS
import { IconHouse } from "~/app/_icons/IconHouse";
import { IconStar } from "~/app/_icons/IconStar";
import { IconShare } from "~/app/_icons/IconShare";
import { IconUsersThree } from "~/app/_icons/IconUsersThree";
import { IconBookOpen } from "~/app/_icons/IconBookOpen";
import { IconShoppingBagOpen } from "~/app/_icons/IconShoppingBagOpen";
import { IconUploadSimple } from "~/app/_icons/IconUploadSimple";

export default function Sidebar() {
  const router = useRouter();
  const utils = api.useUtils();
  const { mutateAsync: createBase, isPending } = api.base.create.useMutation({
    onSuccess: async (base) => {
      await utils.base.listMine.invalidate(); // refresh Home
      router.push(`/b/${base.id}`);           // adjust if your route differs
    },
  });

  const handleCreate = useCallback(async () => {
    await createBase({ name: "Untitled Base" });
  }, [createBase]);

  return (
    <aside className="flex min-h-screen w-[240px] flex-col border-r border-neutral-200 bg-white">
      {/* Brand row */}
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

      {/* Nav */}
      <nav className="flex-1 select-none p-2 text-[13px]">
        <NavItem icon={<IconHouse />} label="Home" active />
        <Section
          label="Starred"
          icon={<IconStar />}
          helper="Your starred bases, interfaces, and workspaces will appear here"
        />
        <Section label="Shared" icon={<IconShare />} />
        {/* Workspaces */}
        <Section label="Workspaces" icon={<IconUsersThree />}>
          <button className="ml-auto rounded px-1.5 text-neutral-500 hover:bg-neutral-100">+</button>
        </Section>
      </nav>

      {/* Bottom */}
      <div className="mt-auto border-t border-neutral-200 p-3">
        {/* quick links */}
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

        {/* Create button now BELOW the list */}
        <div className="mt-4 rounded-lg border border-neutral-200">
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="flex w-full items-center justify-center rounded-lg bg-[#4169ff] px-3 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
            title="Hook to your create flow"
          >
            {isPending ? "Creating…" : "+ Create"}
          </button>
        </div>
      </div>
    </aside>
  );
}

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
        active
          ? "bg-neutral-100 font-medium text-neutral-900"
          : "text-neutral-700 hover:bg-neutral-50",
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
        <div className="mx-2 mt-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-[12px] text-neutral-600">
          {helper}
        </div>
      )}
    </div>
  );
}
