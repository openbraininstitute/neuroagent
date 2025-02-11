import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { BToolMetadataDetailed } from "@/lib/types";
import { PersonStanding, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ToolDetailedMetadata = {
  name: string;
  nameFrontend: string;
  description: string;
  descriptionFrontend: string;
  inputSchema: string;
  hil: boolean;
  isOnline?: boolean; // Optional since it wasn't in the original type
};

async function getTool(toolName: string): Promise<ToolDetailedMetadata> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("No session found");
  }

  const tool = (await fetcher({
    method: "GET",
    path: "/tools/{name}",
    pathParams: { name: toolName },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })) as BToolMetadataDetailed;

  return {
    name: tool.name,
    nameFrontend: tool.name_frontend,
    description: tool.description,
    descriptionFrontend: tool.description_frontend,
    inputSchema: tool.input_schema,
    hil: tool.hil,
    isOnline: tool.is_online,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ toolName: string }>;
}) {
  const paramsAwaited = await params;
  const toolName = paramsAwaited?.toolName;
  const tool = await getTool(toolName);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{tool.nameFrontend}</h1>
        <div className="flex gap-2 items-center">
          {tool.hil && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <PersonStanding className="h-5 w-5" />
              <span>Human in the Loop</span>
            </div>
          )}
          {tool.isOnline ? (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <Wifi className="h-5 w-5" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <WifiOff className="h-5 w-5" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{tool.descriptionFrontend}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {tool.description}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              {tool.inputSchema}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
