"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import BaseCard from "~/app/_components/BaseCard";

const PALETTE: string[] = [
  "#2E7D32", "#1976D2", "#8E24AA", "#F57C00",
  "#00796B", "#C2185B", "#5D4037", "#455A64",
  "#7B1FA2", "#388E3C",
];

// Always return a string (handles noUncheckedIndexedAccess)
function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? "#7955FF";
}

export function BaseList() {
  const utils = api.useUtils();
  const { data: bases, isLoading } = api.base.listMine.useQuery();

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(() => randomColor()); // lazy init
  const [icon, setIcon] = useState("📁");

  const createBase = api.base.create.useMutation({
    onSuccess: async () => {
      setName("");
      setColor(randomColor()); // roll a new one after creating
      await utils.base.listMine.invalidate();
    },
  });

  if (isLoading) return <p className="text-white/70">Loading your bases…</p>;

  return (
    <div className="w-full max-w-4xl space-y-6">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createBase.mutate({ name, color, icon });
        }}
      >
        <input
          className="flex-1 min-w-[220px] rounded-md bg-white/10 px-3 py-2 text-white outline-none placeholder:text-white/60"
          placeholder="New base name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="color"
          className="h-10 w-10 rounded"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Tile color"
        />
        <input
          className="w-16 rounded-md bg-white/10 px-2 py-2 text-center text-white"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          title="(Optional) Emoji; not shown on new tile style"
        />
        <button
          type="submit"
          className="rounded-md bg-white/20 px-4 py-2 font-semibold text-white hover:bg-white/30"
          disabled={createBase.isPending}
        >
          {createBase.isPending ? "Creating…" : "Create base"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {(bases ?? []).map((b) => (
          <BaseCard key={b.id} base={b} />
        ))}
      </div>

      {bases?.length === 0 && (
        <p className="text-white/70">No bases yet—create your first one above.</p>
      )}
    </div>
  );
}
