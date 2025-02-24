import { auth } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { BToolMetadataDetailed } from "@/lib/types";
import { PersonStanding, Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { ToolInputSchema } from "@/components/tool-page/tool-input-schema";
import Link from "next/link";

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

  // Parse the input schema JSON
  let parsedSchema;
  try {
    parsedSchema = JSON.parse(tool.inputSchema);
  } catch {
    parsedSchema = { parameters: [] }; // Fallback to empty parameters if parsing fails
  }

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <Link
        href="/tools"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tools
      </Link>

      <div className="flex flex-col items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">{tool.nameFrontend}</h1>

        <div className="flex gap-4 items-center">
          {tool.hil ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <PersonStanding className="h-5 w-5" />
              <span>Human in the Loop</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <PersonStanding className="h-5 w-5 opacity-50" />
              <span>No Human Permission Required</span>
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

        <div className="text-sm text-muted-foreground">
          Tool slug: {tool.name}
        </div>
      </div>

      <div className="space-y-8 pb-6">
        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap break-words">
              {tool.descriptionFrontend}
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Input Parameters</h2>
          <ToolInputSchema schema={parsedSchema} />
        </div>
      </div>
    </div>
  );
}
