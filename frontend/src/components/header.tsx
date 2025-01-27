"use client";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-end gap-4 p-4 text-center border-b-2">
      {status === "loading" ? (
        <div>Loading...</div>
      ) : session ? (
        <>
          <span>Hello, {session.user?.name || "User"}!</span>
          <button onClick={() => signOut()} className="hover:underline">
            Sign out
          </button>
        </>
      ) : (
        <button onClick={() => signIn("keycloak")} className="hover:underline">
          Sign in
        </button>
      )}

      <Link href="/settings">
        <Settings className="hover:scale-[1.1] transition" />
      </Link>
    </header>
  );
}
