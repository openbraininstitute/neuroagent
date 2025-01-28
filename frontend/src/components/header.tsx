"use client";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between p-4 text-center border-b-2">
      {/* Left side */}
      <div>
        {status !== "loading" && session && (
          <span>Hello, {session.user?.name || "User"}!</span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {status === "loading" ? (
          <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full" />
        ) : session ? (
          <>
            <Link href="/settings">
              <Settings className="hover:scale-[1.1] transition" />
            </Link>
            <button onClick={() => signOut()}>
              <LogOut className="hover:scale-[1.1] transition" />
            </button>
          </>
        ) : (
          <Button
            onClick={() => signIn("keycloak")}
            variant="default"
            className="hover:scale-[1.1] transition"
          >
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
