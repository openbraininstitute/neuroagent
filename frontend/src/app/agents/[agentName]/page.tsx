import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { ArrowLeft, LoaderPinwheel } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CustomError } from "@/lib/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AgentMetadata } from "../page";
import { ToolMetadata } from "@/app/tools/page";
import { BDetailedAgentMetadata } from "@/lib/types";
import { agentIconMapping } from "@/lib/mappings";

type AgentDetailedMetadata = AgentMetadata & {
  tools: ToolMetadata[];
};

async function getTool(agentName: string): Promise<AgentDetailedMetadata> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  try {
    const agent = (await fetcher({
      method: "GET",
      path: "/agents/{agentName}",
      pathParams: { agentName },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })) as BDetailedAgentMetadata;

    return {
      name: agent.name,
      nameFrontend: agent.name_frontend,
      description: agent.description,
      tools: agent.tools
        .map((tool) => {
          return {
            name: tool.name,
            nameFrontend: tool.name_frontend,
          };
        })
        .sort((a, b) => a.nameFrontend.localeCompare(b.nameFrontend)),
    };
  } catch (error) {
    if ((error as CustomError).statusCode === 404) {
      notFound();
    } else {
      throw error;
    }
  }
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ agentName: string }>;
}) {
  const paramsAwaited = await params;
  const agentName = paramsAwaited?.agentName;
  const agent = await getTool(agentName);

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <Link
        href={`/agents`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="flex flex-row items-center">
          <span className="mr-2 inline-flex items-center text-white group-hover:text-pink-300 transition-colors">
            {agentIconMapping[agent.name] ?? (
              <LoaderPinwheel className="w-5 h-5" />
            )}
          </span>
          <h1 className="text-3xl font-bold">{agent.nameFrontend}</h1>
        </div>

        <div className="flex gap-4 items-center">
          <div className="text-sm text-muted-foreground">
            Agent slug: {agent.name}
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tool.agentNames.map((agent, index) => (
          <Link
            key={agent}
            href={`/tools?agent=${encodeURIComponent(agent)}`}
            className="hover:scale-105 transition-transform"
          >
            <Card className="cursor-pointer bg-muted/50 hover:shadow-lg transition-shadow mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-bold">
                  {tool.agentNamesFrontend[index]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Explore tools related to the {tool.agentNamesFrontend[index]}.
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div> */}

      <div className="space-y-8 pb-6">
        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap break-words">
              {agent.description}
            </p>
          </div>
        </div>

        <section className="bg-gray-900 text-white py-8 px-4">
          <h1 className="text-3xl font-bold text-center mb-6">Tools</h1>

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
    "
          >
            {agent.tools.map((tool) => (
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
        </section>
      </div>
    </div>
  );
}
