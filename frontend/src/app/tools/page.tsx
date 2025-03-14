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

export type ToolMetadata = {
  name: string;
  nameFrontend: string;
};

async function getTools(
  searchParams?: Record<string, string>,
): Promise<ToolMetadata[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const tools = (await fetcher({
    method: "GET",
    path: "/tools",
    queryParams: searchParams,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })) as BToolMetadata[];

  return tools
    .map((tool) => ({
      name: tool.name,
      nameFrontend: tool.name_frontend,
    }))
    .sort((a, b) => a.nameFrontend.localeCompare(b.nameFrontend));
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const searchParamsAwaited = await searchParams;
  const tools = await getTools(searchParamsAwaited);
  return (
    <>
      <h1 className="text-2xl my-4 text-center font-bold mb-6">Tools</h1>

      <div
        className="
      grid
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-3
      gap-6
      max-w-[90%]
      mx-auto
      items-stretch
      overflow-y-auto
    "
      >
        {tools.map((tool) => (
          <Link key={tool.name} href={`/tools/${tool.name}`}>
            <Card
              className="
            bg-gray-800
            rounded-lg
            shadow-lg
            p-6
            text-center
            transition-transform
            duration-200
            hover:scale-105
            hover:shadow-xl
            cursor-pointer
            flex
            flex-col
            justify-between
            h-full
          "
            >
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">
                  {tool.nameFrontend}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {tool.name}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
