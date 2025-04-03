"use client";

import { useState } from "react";
import {
  PanelRightOpen,
  PanelRightClose,
  Search,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(true);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      <div
        className={`min-w-10 shadow-md transition-all duration-300 ease-in-out ${
          showSidebar ? "w-[16rem] md:w-[18rem] lg:w-[20rem]" : "w-[3.5rem]"
        } flex flex-col border-r-2`}
      >
        <div className="flex justify-between">
          <div className="p-4">
            {showSidebar ? (
              <PanelRightOpen
                className="transition hover:scale-[1.1]"
                onClick={toggleSidebar}
              />
            ) : (
              <PanelRightClose
                className="transition hover:scale-[1.1]"
                onClick={toggleSidebar}
              />
            )}
          </div>
          {showSidebar && (
            <div className="flex gap-4 p-4">
              <Search className="transition hover:scale-[1.1]" />
              <Link href="/">
                <SquarePen className="transition hover:scale-[1.1]" />
              </Link>
            </div>
          )}
        </div>
        {showSidebar && (
          <div className="flex-1 overflow-auto pt-4">{children}</div>
        )}
      </div>
    </>
  );
}
