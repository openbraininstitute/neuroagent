"use client";
import { Settings, LogOut, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

import { ThemeToggle } from "@/components/layout/theme-changer";
import { useProgress } from "@bprogress/next";
import { ExtendedSession } from "@/lib/auth";
import { useState } from "react";

export function Header() {
  const { data: session, status } = useSession() as {
    data: ExtendedSession | null;
    status: "authenticated" | "loading" | "unauthenticated";
  };
  const { start } = useProgress();
  const [isClicked, setIsClicked] = useState(false);
  const accessToken = session?.accessToken;

  const handleCopy = (accessToken: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(accessToken);
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 1500);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = accessToken;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      setIsClicked(true);
      document.body.removeChild(textarea);
      setTimeout(() => setIsClicked(false), 1500);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b-2 p-4 text-center">
      <div>
        {status !== "loading" && session && (
          <span>Hello, {session.user?.name || "User"}!</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {accessToken && (
          <Button
            onClick={() => handleCopy(accessToken)}
            className="flex w-[120px] items-center justify-center gap-2"
            variant="outline"
          >
            {isClicked ? (
              <>
                <Check className="h-4 w-4" />
                Copied !
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Token
              </>
            )}
          </Button>
        )}
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
