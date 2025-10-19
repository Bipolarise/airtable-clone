"use client";

import Link from "next/link";
import Image from "next/image";
// NEW:
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function Sidebar() {
  // NEW:
  const router = useRouter();
  const utils = api.useUtils();
  const { mutateAsync: createBase, isPending } = api.base.create.useMutation({
    onSuccess: async (base) => {
      await utils.base.listMine.invalidate();           // refresh Home
      router.push(`/b/${base.id}`);                     // adjust if your route differs
    },
  });

  // NEW:
  const handleCreate = useCallback(async () => {
    await createBase({
      name: "Untitled base",
      // optionally pass icon/color if your mutation supports it
      // icon: "🟨",
      // color: "#7c3aed",
    });
  }, [createBase]);

  return (
    <aside className="flex min-h-screen w-[240px] flex-col border-r border-neutral-200 bg-white">
      {/* Brand row */}
      <div className="flex h-12 items-center gap-3 border-b border-neutral-200 px-3">
        <button className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-neutral-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <Image src="/airtable-favicon.ico" alt="Airtable" width={20} height={20} />
        <span className="text-[15px] font-semibold">Airtable</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 select-none p-2 text-[13px]">
        <NavItem icon={<Circle />} label="Home" active />
        <Section label="Starred" icon={<Star />} />
        <Section
          label="Shared"
          icon={<Share />}
          helper="Your starred bases, interfaces, and workspaces will appear here"
        />
        <Section label="Workspaces" icon={<Briefcase />}>
          <button className="ml-auto rounded px-1.5 text-neutral-500 hover:bg-neutral-100">+</button>
        </Section>
      </nav>

      {/* Bottom */}
      <div className="mt-auto border-t border-neutral-200 p-3">
        <div className="rounded-lg border border-neutral-200">
          <button
            // NEW:
            onClick={handleCreate}
            disabled={isPending}
            className="flex w-full items-center justify-center rounded-lg bg-[#4169ff] px-3 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
            title="Hook to your create flow"
          >
            {isPending ? "Creating…" : "+ Create"}
          </button>
        </div>

        <div className="mt-4 space-y-2 px-1 text-[12px] text-neutral-600">
          <button className="block w-full rounded-md px-2 py-1 text-left hover:bg-neutral-50">Templates and apps</button>
          <button className="block w-full rounded-md px-2 py-1 text-left hover:bg-neutral-50">Marketplace</button>
          <button className="block w-full rounded-md px-2 py-1 text-left hover:bg-neutral-50">Import</button>
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
        <div className="mx-2 mt-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-[12px] text-neutral-600">
          {helper}
        </div>
      )}
    </div>
  );
}

/* minimal icons */
function Circle() { return <span className="h-3.5 w-3.5 rounded-full border border-neutral-400" />; }
function Star() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 15 9 22 9 16.5 13 18.5 20 12 16 5.5 20 7.5 13 2 9 9 9 12 2"/></svg>; }
function Share() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>; }
function Briefcase() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>; }
