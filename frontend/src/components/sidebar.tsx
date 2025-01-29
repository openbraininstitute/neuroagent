"use client";

import { useState } from "react";
import {
  PanelRightOpen,
  PanelRightClose,
  Search,
  SquarePen,
} from "lucide-react";
import Link from "next/link";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [showSidebar, setShowSidebar] = useState(true);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <>
      <div className="relative">
        <div
          className={`absolute top-0 left-0 h-full border-r-2 shadow-md transition-transform duration-300 ${
            showSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex justify-between border-b-2">
            <div className="p-4">
              <PanelRightOpen
                className="hover:scale-[1.1] transition"
                onClick={toggleSidebar}
              />
            </div>
            <div className="flex p-4 gap-4">
              <Search className="hover:scale-[1.1] transition" />
              <Link href="/">
                <SquarePen className="hover:scale-[1.1] transition" />
              </Link>
            </div>
          </div>
          <div className="opacity-50 my-4"></div>
          <div className="overflow-auto flex-1">{children}</div>
        </div>
        <div
          className={`p-4 relative left-0 top-0 border-r-2 h-full transition-opacity duration-1000
    ${showSidebar ? "opacity-0 invisible" : "opacity-100 visible"}`}
        >
          <PanelRightClose
            className="hover:scale-[1.1] transition"
            size={24}
            onClick={toggleSidebar}
          />
        </div>
      </div>
    </>
  );
}
