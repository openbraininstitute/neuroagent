"use client";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

import { ThemeToggle } from "@/components/layout/theme-changer";
import { useProgress } from "@bprogress/next";

export function Header() {
  const { data: session, status } = useSession();
  const { start } = useProgress();

  return (
    <header className="flex h-16 items-center justify-between border-b-2 p-4 text-center">
      <div>
        {status !== "loading" && session && (
          <span>Hello, {session.user?.name || "User"}!</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {status === "loading" ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
        ) : session ? (
          <>
            <Link href="/settings">
              <Settings className="transition hover:scale-[1.1]" />
            </Link>
            <button onClick={() => signOut()}>
              <LogOut className="transition hover:scale-[1.1]" />
            </button>
          </>
        ) : (
          <Button
            onClick={() => {
              start();
              signIn("keycloak", {
                callbackUrl: "localhost:3000",
              });
            }}
            variant="default"
            className="transition hover:scale-[1.1]"
          >
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
