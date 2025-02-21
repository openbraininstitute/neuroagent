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
  console.log("Re-render sidebar");

  return (
    <>
      <div
        className={`
        transition-all duration-300 ease-in-out shadow-md min-w-10
        ${
          showSidebar ? "w-[16rem] md:w-[18rem] lg:w-[20rem]" : "w-[3.5rem]"
        } border-r-2 flex flex-col
      `}
      >
        <div className="flex justify-between">
          <div className="p-4">
            {showSidebar ? (
              <PanelRightOpen
                className="hover:scale-[1.1] transition"
                onClick={toggleSidebar}
              />
            ) : (
              <PanelRightClose
                className="hover:scale-[1.1] transition"
                onClick={toggleSidebar}
              />
            )}
          </div>
          {showSidebar && (
            <div className="flex p-4 gap-4">
              <Search className="hover:scale-[1.1] transition" />
              <Link href="/">
                <SquarePen className="hover:scale-[1.1] transition" />
              </Link>
            </div>
          )}
        </div>
        {showSidebar && (
          <div className="overflow-auto flex-1 pt-4">{children}</div>
        )}
      </div>
    </>
  );
}
