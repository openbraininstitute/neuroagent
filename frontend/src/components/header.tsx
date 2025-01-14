import { Settings } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex justify-end p-4 text-center border-b-2">
      <Link href="/settings">
        <Settings />
      </Link>
    </header>
  );
}
