import { PersonStanding, Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { ToolInputSchema } from "@/components/tool-page/tool-input-schema";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTool } from "@/lib/server-fetches";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ toolName: string }>;
}) {
  const { toolName } = await params;

  const tool = await getTool(toolName);

  return {
    title: tool?.nameFrontend,
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

  if (!tool) {
    return notFound();
  }

  // Parse the input schema JSON
  let parsedSchema;
  try {
    parsedSchema = JSON.parse(tool.inputSchema);
  } catch {
    parsedSchema = { parameters: [] }; // Fallback to empty parameters if parsing fails
  }

  return (
    <div className="container mx-auto h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6">
      <Link
        href="/tools"
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tools
      </Link>

      <div className="mb-8 flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">{tool.nameFrontend}</h1>

        <div className="flex items-center gap-4">
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
        <div className="rounded-lg bg-muted/50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Description</h2>
          <div className="space-y-4">
            <p className="whitespace-pre-wrap break-words text-muted-foreground">
              {tool.descriptionFrontend}
            </p>
          </div>
        </div>

        {tool.utterances.length !== 0 && (
          <div className="rounded-lg bg-muted/50 p-6">
            <h2 className="mb-4 text-xl font-semibold">Example Use-Cases</h2>
            <div className="space-y-4"></div>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">
              {"• " + tool.utterances.join("\n• ")}
            </p>
            <div />
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Input Parameters</h2>
          <ToolInputSchema schema={parsedSchema} />
        </div>
      </div>
    </div>
  );
}
