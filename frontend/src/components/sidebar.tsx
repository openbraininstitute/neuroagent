import { PanelRightOpen, Search, SquarePen } from "lucide-react";
import { ThreadCardSidebar } from "@/components/thread-card-sidebar";
import Link from "next/link";

export function Sidebar() {
  return (
    <div className="w-[15%] border-r-2">
      <div className="flex justify-between">
        <div className="p-4">
          <PanelRightOpen className="hover:scale-[1.1] transition" size={24} />
        </div>
        <div className="flex p-4 gap-4 ">
          <Search className="hover:scale-[1.1] transition" size={24} />
          <Link href="/">
            <SquarePen className="hover:scale-[1.1] transition" size={24} />
          </Link>
        </div>
      </div>
      <div className="border-b-2 opacity-50 my-4"></div>
      <div className="flex flex-col gap-2 pl-3">
        <ThreadCardSidebar title="Hello there" threadID="1" />
        <ThreadCardSidebar title="Great day" threadID="2" />
        <ThreadCardSidebar title="Something day " threadID="3" />
        <ThreadCardSidebar title="Very boring chat" threadID="4" />
      </div>
    </div>
  );
}
