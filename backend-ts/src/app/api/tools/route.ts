/**
 * Tools API Route
 *
 * Endpoint:
 * - GET /api/tools - List all available tools with basic metadata
 *
 * Features:
 * - Returns basic tool metadata (name, name_frontend)
 * - Authentication required
 * - Matches Python backend format
 * - Uses class-based approach (no instantiation needed for metadata)
 *
 * Translated from backend/src/neuroagent/app/routers/tools.py
 */

import { NextResponse, type NextRequest } from 'next/server';

import { validateAuth, AuthenticationError } from '@/lib/middleware/auth';
import { toolRegistry, registerToolClasses } from '@/lib/tools';

/**
 * Tool response schema - matches Python ToolMetadata
 */
interface ToolMetadata {
  name: string;
  name_frontend: string;
}

/**
 * Detailed tool metadata response - matches Python ToolMetadataDetailed
 * @deprecated Currently unused, kept for future API compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _ToolMetadataDetailed extends ToolMetadata {
  description: string;
  description_frontend: string;
  utterances: string[];
  input_schema: string; // JSON string
  hil: boolean;
  is_online: boolean;
}

/**
 * Input schema parameter definition
 * @deprecated Currently unused, kept for future API compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _InputSchemaParameter {
  name: string;
  required: boolean;
  default: string | null;
  description: string;
}

/**
 * Input schema structure
 * @deprecated Currently unused, kept for future API compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _InputSchema {
  parameters: _InputSchemaParameter[];
}

/**
 * GET /api/tools
 *
 * Returns a list of all available tools with their basic metadata.
 * Matches the Python backend format: list of {name, name_frontend}
 *
 * Like Python's get_available_tools(), this accesses tool metadata
 * directly from the class (ClassVar equivalent) without instantiation.
 *
 * Response:
 * - Array of tool objects with name and name_frontend
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication (required like Python backend)
    await validateAuth(request);

    // Initialize all tools (including MCP tools)
    // This ensures MCP tools are loaded and registered
    const { initializeTools } = await import('@/lib/tools');
    const { getSettings } = await import('@/lib/config/settings');

    const settings = getSettings();

    // Initialize tools with full configuration (including MCP)
    await initializeTools({
      exaApiKey: settings.tools.exaApiKey,
      sanityUrl: settings.tools.sanity.url,
      entitycoreUrl: settings.tools.entitycore.url,
      entityFrontendUrl: settings.tools.frontendBaseUrl,
      obiOneUrl: settings.tools.obiOne.url,
      mcpConfig: settings.mcp, // ← This loads MCP tools
    });

    // Get metadata for all tools (both classes and instances)
    // This includes MCP tools which are registered as instances
    const allMetadata = toolRegistry.getAllMetadata();

    // Build response - convert to API format
    const toolsResponse: ToolMetadata[] = allMetadata.map((metadata) => ({
      name: metadata.name,
      name_frontend: metadata.nameFrontend || metadata.name,
    }));

    return NextResponse.json(toolsResponse);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: 'Authentication failed', message: error.message },
        { status: 401 }
      );
    }

    console.error('Error fetching tools:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
