import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { BToolMetadata } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";

type ToolMetadata = {
  name: string;
  nameFrontend: string;
};

async function getTools(): Promise<ToolMetadata[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const tools = (await fetcher({
    method: "GET",
    path: "/tools",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })) as BToolMetadata[];

  return tools
    .map((tool) => ({
      name: tool.name,
      nameFrontend: tool.name_frontend,
    }))
    .sort((a, b) => a.nameFrontend.localeCompare(b.nameFrontend));
}

export default async function ToolsPage() {
  const tools = await getTools();

  return (
    <>
      <h1 className="text-2xl my-4 text-center font-bold mb-6">Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mx-4 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {tools.map((tool) => (
          <Link key={tool.name} href={`/tools/${tool.name}`}>
            <Card className="text-center transition-all hover:bg-muted hover:scale-[1.02] hover:shadow-md cursor-pointer h-full">
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
