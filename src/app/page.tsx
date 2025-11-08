// src/app/page.tsx
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import HomeShell from "./_components/home-shell";
import SignInCard from "./_components/SignInCard";

export default async function Home() {
  const session = await auth();

  // prefetch bases for a snappy first render when logged in
  if (session?.user) {
    void api.base.listMine.prefetch();
  }

  return (
    <HydrateClient>
      {session?.user ? <HomeShell /> : <SignInCard />}
    </HydrateClient>
  );
}
