import { MessageCircle } from "lucide-react";

type ThreadCardSidebarProps = {
  title: string;
};
export function ThreadCardSidebar({ title }: ThreadCardSidebarProps) {
  return (
    <div className="flex gap-3">
      <MessageCircle />
      <p className="">{title}</p>
    </div>
  );
}
