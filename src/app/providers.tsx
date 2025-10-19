"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Order isn't critical for these two, but this is a common pattern.
  return (
    <SessionProvider>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </SessionProvider>
  );
}
