"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { useMemo } from "react";

export default function UserMenu() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />;
  }

  if (status === "unauthenticated") {
    return (
      <button
        onClick={() => signIn("google")}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] hover:bg-neutral-50"
      >
        Sign in
      </button>
    );
  }

  const user = data?.user;
  const initial = useMemo(
    () => (user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"),
    [user?.name, user?.email]
  );

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer">
        {user?.image ? (
          <Image
            src={user.image}
            alt={user?.name ?? "User"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-neutral-300 text-center leading-8 text-white">
            {initial}
          </div>
        )}
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
        <div className="px-3 py-2">
          <div className="truncate text-[13px] font-medium">{user?.name ?? "Signed in"}</div>
          <div className="truncate text-[12px] text-neutral-500">{user?.email}</div>
        </div>
        <div className="h-px bg-neutral-200" />
        <button
          className="w-full px-3 py-2 text-left text-[13px] hover:bg-neutral-50"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </details>
  );
}
