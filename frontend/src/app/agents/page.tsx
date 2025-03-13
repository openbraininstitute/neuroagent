import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { BAgentMetadata } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { auth } from "@/lib/auth";
import { LoaderPinwheel } from "lucide-react";
import { agentIconMapping } from "@/lib/mappings";

export type AgentMetadata = {
  name: string;
  nameFrontend: string;
  description: string;
};

async function getAgents(): Promise<AgentMetadata[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const agents = (await fetcher({
    method: "GET",
    path: "/agents",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })) as Record<string, BAgentMetadata>;

  return Object.entries(agents)
    .map(([name, agent]) => ({
      name: name, // Using the key as the name
      nameFrontend: agent.name_frontend,
      description: agent.description,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sorting by the name field
}

export default async function AgentsPage() {
  const agents = await getAgents();
  // Hardcoded for now. Feel free to unify later.

  return (
    <>
      <h1 className="text-3xl font-extrabold text-center my-8 text-white">
        Agents
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mx-6 p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {agents.map((agent) => (
          <Link key={agent.name} href={`/agents/${agent.name}`} passHref>
            <Card
              className="
            group
            relative
            bg-gradient-to-br
            from-gray-700
            to-gray-800
            border
            border-gray-600
            rounded-xl
            p-6
            text-white
            shadow-md
            transition-all
            transform
            hover:-translate-y-1
            hover:shadow-xl
            cursor-pointer
            h-full
          "
            >
              <CardHeader className="mb-4">
                <div className="flex flex-col justify-center items-center">
                  <CardTitle className="flex items-center text-2xl font-extrabold">
                    <span className="mr-2 inline-flex items-center text-white group-hover:text-pink-300 transition-colors">
                      {agentIconMapping[agent.name] ?? (
                        <LoaderPinwheel className="w-5 h-5" />
                      )}
                    </span>

                    <span
                      className="
                  text-transparent
                  bg-clip-text
                  bg-gradient-to-r
                  from-blue-300
                  to-green-300
                  group-hover:from-pink-300
                  group-hover:to-yellow-300
                  transition-colors
                "
                    >
                      {agent.nameFrontend}
                    </span>
                  </CardTitle>

                  <CardDescription className="text-gray-300 text-sm italic">
                    {agent.name}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="text-gray-200 text-base leading-relaxed">
                {agent.description}
              </CardContent>

              <div
                className="
              absolute
              bottom-4
              left-1/2
              transform
              -translate-x-1/2
              text-xs
              font-semibold
              text-blue-300
              opacity-80
              group-hover:text-yellow-300
              transition-colors
            "
              >
                Click to learn more
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
