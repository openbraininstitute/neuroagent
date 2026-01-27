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
 */

import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/config/settings';
import { initializeTools, toolRegistry } from '@/lib/tools';
import { validateAuth, AuthenticationError } from '@/lib/middleware/auth';
import { NextRequest } from 'next/server';

/**
 * Tool response schema - matches Python ToolMetadata
 */
interface ToolMetadata {
  name: string;
  name_frontend: string;
}

/**
 * GET /api/tools
 *
 * Returns a list of all available tools with their basic metadata.
 * Matches the Python backend format: list of {name, name_frontend}
 *
 * Response:
 * - Array of tool objects with name and name_frontend
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication (required like Python backend)
    await validateAuth(request);

    const settings = getSettings();

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    const jwtToken = authHeader?.replace('Bearer ', '');

    // Initialize tools if not already initialized
    if (toolRegistry.getAll().length === 0) {
      await initializeTools({
        exaApiKey: settings.tools.exaApiKey,
        entitycoreUrl: settings.tools.entitycore.url,
        entityFrontendUrl: settings.tools.frontendBaseUrl,
        vlabId: undefined, // Tools API doesn't have user context
        projectId: undefined,
        jwtToken,  // Pass JWT token for authenticated requests
        obiOneUrl: settings.tools.obiOne.url,
        mcpConfig: settings.mcp,
      });
    }

    // Get all registered tools
    const tools = toolRegistry.getAll();

    // Build response - simple format matching Python backend
    const toolsResponse: ToolMetadata[] = tools.map((tool) => ({
      name: tool.metadata.name,
      name_frontend: tool.getFrontendName(),
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
