import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getBrainRegionsQueryParamsSchema } from "./zodSchemas.js"

const ENTITYCORE_API_BASE = process.env.ENTITYCORE_API_BASE;
const ENTITYCODE_BEARER_TOKEN = process.env.ENTITYCODE_BEARER_TOKEN;

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
  "Retrieves a list of brain regions from the entitycore API. Supports filtering, pagination, and ordering.",
  getBrainRegionsQueryParamsSchema,
  async (params) => {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        // Make sure to only append if value is not undefined or null
        queryParams.append(key, String(value));
      }
    }

    const requestUrl = `${ENTITYCORE_API_BASE}/brain-region?${queryParams.toString()}`;
    // console.log(`Requesting URL (getBrainRegions): ${requestUrl}`); // Uncomment for debugging

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${ENTITYCODE_BEARER_TOKEN}`,
        },
      });

      if (!response.ok) {
        let errorBody = "Failed to read error body from API response.";
        try {
            errorBody = await response.text();
        } catch (e) {
            // Ignore if reading the error body fails
        }
        // console.error(`API Error (getBrainRegions) ${response.status}: ${errorBody}`); // Uncomment for debugging
        return {
          content: [{ type: "text", text: `Error fetching brain regions: API request failed with status ${response.status}. Details: ${errorBody}` }],
        };
      }

      const responseData = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(responseData) }],
      };

    } catch (error: any) {
      return {
        content: [{ type: "text", text: `An unexpected error occurred while fetching brain regions: ${error.message}` }],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
