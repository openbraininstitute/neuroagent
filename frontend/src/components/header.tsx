import { Settings } from "lucide-react";
import Link from "next/link";

import { DropdownTheme } from "@/components/dropdown-theme";

export function Header() {
  return (
    <header className="flex justify-end p-4 text-center border-b-2">
      <DropdownTheme />
      <Link href="/settings">
        <Settings className="hover:scale-[1.1] transition h-[100%]" />
      </Link>
    </header>
  );
}
