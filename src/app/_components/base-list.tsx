"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export function BaseList() {
  const utils = api.useUtils();
  const { data: bases, isLoading } = api.base.listMine.useQuery();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [icon, setIcon] = useState("📁");

  const createBase = api.base.create.useMutation({
    onSuccess: async () => {
      setName("");
      await utils.base.listMine.invalidate();
    },
  });

  if (isLoading) return <p className="text-white/70">Loading your bases…</p>;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createBase.mutate({ name, color, icon });
        }}
      >
        <input
          className="flex-1 rounded-md bg-white/10 px-3 py-2 text-white outline-none placeholder:text-white/60"
          placeholder="New base name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="color"
          className="h-10 w-10 rounded"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          className="w-16 rounded-md bg-white/10 px-2 py-2 text-center text-white"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          title="Emoji icon"
        />
        <button
          type="submit"
          className="rounded-md bg-white/20 px-4 py-2 font-semibold text-white hover:bg-white/30"
          disabled={createBase.isPending}
        >
          {createBase.isPending ? "Creating…" : "Create base"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(bases ?? []).map((b) => (
          <Link
            key={b.id}
            href={`/b/${b.id}`}
            className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{b.icon ?? "📁"}</span>
              <div>
                <div className="font-semibold text-white">{b.name}</div>
                <div className="text-xs text-white/60">
                  Updated {new Date(b.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {bases?.length === 0 && (
        <p className="text-white/70">No bases yet—create your first one above.</p>
      )}
    </div>
  );
}