import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getBrainRegionsQueryParamsSchema,
  getBrainRegionsPathParamsSchema,
  getBrainRegionByIdQueryParamsSchema,
  getBrainRegionByIdPathParamsSchema,
  headersSchema,
} from "./zodSchemas.js";
import { logger, makeGetRequest } from "./helper.js";
import { ENTITYCORE_API_BASE, ENTITYCORE_BEARER_TOKEN } from "./env.js";

// Create an MCP server
const server = new McpServer({
  name: "Entitycore",
  version: "1.0.0",
});

server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

server.tool(
  "getBrainRegions",
  "Get brain regions with optional filtering and pagination",
  {
    ...getBrainRegionsQueryParamsSchema,
    ...getBrainRegionsPathParamsSchema,
    ...headersSchema,
  },
  async (params: Record<string, any>) => {
    logger.info("getBrainRegions");

    // Parse each part of the params separately, ignoring extra fields
    const queryParams = z
      .object(getBrainRegionsQueryParamsSchema)
      .parse(params);
    const pathParams = z.object(getBrainRegionsPathParamsSchema).parse(params);
    const headers = z.object(headersSchema).parse(params);

    const result = await makeGetRequest(
      "brain-region",
      queryParams,
      pathParams,
      headers,
      ENTITYCORE_API_BASE,
      ENTITYCORE_BEARER_TOKEN
    );
    return result;
  }
);

server.tool(
  "getBrainRegionById",
  "Get a specific brain region by its ID",
  {
    ...getBrainRegionByIdQueryParamsSchema,
    ...getBrainRegionByIdPathParamsSchema,
    ...headersSchema,
  },
  async (params: Record<string, any>) => {
    logger.info("getBrainRegionById");

    // Parse each part of the params separately, ignoring extra fields
    const queryParams = z
      .object(getBrainRegionByIdQueryParamsSchema)
      .parse(params);
    const pathParams = z
      .object(getBrainRegionByIdPathParamsSchema)
      .parse(params);
    const headers = z.object(headersSchema).parse(params);

    const result = await makeGetRequest(
      "brain-region/{id_}",
      queryParams,
      pathParams,
      headers,
      ENTITYCORE_API_BASE,
      ENTITYCORE_BEARER_TOKEN
    );
    return result;
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
