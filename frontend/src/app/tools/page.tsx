import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { getTools } from "@/lib/server-fetches";

export async function generateMetadata() {
  return {
    title: "Available tools",
  };
}

export default async function ToolsPage() {
  const tools = await getTools();

  return (
    <>
      <h1 className="my-4 mb-6 text-center text-2xl font-bold">Tools</h1>
      <div className="mx-4 grid max-h-[calc(100vh-8rem)] grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.name} href={`/tools/${tool.name}`}>
            <Card className="h-full cursor-pointer text-center transition-all hover:scale-[1.02] hover:bg-muted hover:shadow-md">
              <CardHeader>
                <CardTitle>{tool.nameFrontend}</CardTitle>
                <CardDescription>{tool.name}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
