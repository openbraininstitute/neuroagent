import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getBrainRegionsQueryParamsSchema } from "./zodSchemas.js";
import winston from "winston";

const ENTITYCORE_API_BASE = process.env.ENTITYCORE_API_BASE;
const ENTITYCORE_BEARER_TOKEN = process.env.ENTITYCORE_BEARER_TOKEN;
const LOG_FILE = process.env.LOG_FILE || "server.log";

// Configure logger
const logger = winston.createLogger({
  level: "info", // Log only if info.level is less than or equal to this level
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }), // Log stack traces
    winston.format.splat(),
    winston.format.json() // Log in JSON format
  ),
  defaultMeta: { service: "entitycore-service" },
  transports: [new winston.transports.File({ filename: LOG_FILE })],
});

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
  getBrainRegionsQueryParamsSchema,
  async (params) => {
    logger.info(
      `Received parameters (getBrainRegions): ${JSON.stringify(params)}`
    ); // Replaced console.log
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        // Make sure to only append if value is not undefined or null
        queryParams.append(key, String(value));
      }
    }

    const requestUrl = `${ENTITYCORE_API_BASE}/brain-region?${queryParams.toString()}`;
    logger.info(`Requesting URL (getBrainRegions): ${requestUrl}`); // Replaced console.log

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${ENTITYCORE_BEARER_TOKEN}`,
        },
      });

      if (!response.ok) {
        let errorBody = "Failed to read error body from API response.";
        try {
          errorBody = await response.text();
        } catch (e) {
          // Ignore if reading the error body fails
        }
        logger.error(
          `API Error (getBrainRegions) ${response.status}: ${errorBody}`
        ); // Replaced console.error (commented out)
        return {
          content: [
            {
              type: "text",
              text: `Error fetching brain regions: API request failed with status ${response.status}. Details: ${errorBody}`,
            },
          ],
        };
      }

      const responseData = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(responseData) }],
      };
    } catch (error: any) {
      logger.error(
        `An unexpected error occurred while fetching brain regions: ${error.message}`,
        { error } //
      );
      return {
        content: [
          {
            type: "text",
            text: `An unexpected error occurred while fetching brain regions: ${error.message}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
