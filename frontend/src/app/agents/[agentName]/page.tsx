import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";
import { AgentMetadata } from "../page";
import { BDetailedAgentMetadata } from "@/lib/types";
import { agentIconMapping } from "@/lib/mappings";

type ToolMetadata = {
  name: string;
  nameFrontend: string;
};

type DetailedAgentMetadata = AgentMetadata & {
  tools: ToolMetadata[];
};

async function getAgent(agentName: string): Promise<DetailedAgentMetadata> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const agent = (await fetcher({
    method: "GET",
    path: `/agents/${agentName}`,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })) as BDetailedAgentMetadata;

  const tools: ToolMetadata[] = agent.tools
    .map((tool) => ({
      name: tool.name,
      nameFrontend: tool.name_frontend,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: agent.name,
    nameFrontend: agent.name_frontend,
    description: agent.description,
    tools,
  };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentName: string }>;
}) {
  const paramsAwaited = await params;
  const agentName = paramsAwaited?.agentName;
  const agent = await getAgent(agentName);

  return (
    <>
      <Link
        href={`/agents`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground m-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>
      <div className="flex flex-col items-center space-y-4 mt-8 mb-4">
        <div className="flex flex-row items-center gap-3 mr-2">
          <span>{agentIconMapping[agentName]}</span>
          <h1 className="text-2xl font-bold text-center">
            {agent.nameFrontend}
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Agent slug: {agent.name}
        </div>
        <p className="max-w-lg text-center break-words">{agent.description}</p>
        <h2 className="text-2xl my-4 text-center font-bold">Available Tools</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mx-4 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {agent.tools.map((tool) => (
          <Link key={tool.name} href={`/agents/${agentName}/${tool.name}`}>
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
