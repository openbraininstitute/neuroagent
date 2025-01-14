import { Search } from "lucide-react";
import { ThreadCardSidebar } from "@/components/thread-card-sidebar";

export function Sidebar() {
  return (
    <div className="w-[15%] border-r-2">
      <div className="flex justify-end p-4">
        <Search size={24} />
      </div>
      <p className="text-xl p-4 text-center">Conversations</p>
      <div className="flex flex-col gap-2 pl-3">
        <ThreadCardSidebar title="Hello there" />
        <ThreadCardSidebar title="Great day" />
        <ThreadCardSidebar title="Something day" />
        <ThreadCardSidebar title="Very boring chat" />
      </div>
    </div>
  );
}
