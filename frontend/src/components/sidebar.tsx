"use client";

import { useState } from "react";
import { PanelRightOpen, Search, SquarePen } from "lucide-react";
import Link from "next/link";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [showSidebar, setShowSidebar] = useState(true);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <>
      {showSidebar ? (
        <div className="w-[16rem] border-r-2 flex flex-col md:w-[18rem] lg:w-[20rem]">
          <div className="flex justify-between border-b-2 ">
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
      ) : (
        <div className="p-4 border-r-2">
          <PanelRightOpen
            className="hover:scale-[1.1] transition"
            size={24}
            onClick={toggleSidebar}
          />
        </div>
      )}
    </>
  );
}
