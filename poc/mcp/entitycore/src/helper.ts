import winston from "winston";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { LOG_FILE } from "./env.js";

// Configure logger
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "entitycore-service" },
  transports: [new winston.transports.File({ filename: LOG_FILE })],
});

// Helper function for making GET requests with query parameters
export async function makeGetRequest(
  endpoint: string,
  params: Record<string, any>,
  apiBase: string,
  bearerToken: string
): Promise<CallToolResult> {
  logger.info(`Received parameters for ${endpoint}: ${JSON.stringify(params)}`);

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }

  const requestUrl = `${apiBase}/${endpoint}?${queryParams.toString()}`;
  logger.info(`Requesting URL for ${endpoint}: ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearerToken}`,
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
        `API Error for ${endpoint} ${response.status}: ${errorBody}`
      );
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data: API request failed with status ${response.status}. Details: ${errorBody}`,
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
      `An unexpected error occurred while fetching data: ${error.message}`,
      { error }
    );
    return {
      content: [
        {
          type: "text",
          text: `An unexpected error occurred while fetching data: ${error.message}`,
        },
      ],
    };
  }
}
