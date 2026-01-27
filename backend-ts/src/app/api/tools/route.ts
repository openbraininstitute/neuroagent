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

import { NextResponse } from 'next/server';
import { toolRegistry, registerToolClasses } from '@/lib/tools';
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
 * Detailed tool metadata response - matches Python ToolMetadataDetailed
 */
interface ToolMetadataDetailed extends ToolMetadata {
  description: string;
  description_frontend: string;
  utterances: string[];
  input_schema: string; // JSON string
  hil: boolean;
  is_online: boolean;
}

/**
 * Input schema parameter definition
 */
interface InputSchemaParameter {
  name: string;
  required: boolean;
  default: string | null;
  description: string;
}

/**
 * Input schema structure
 */
interface InputSchema {
  parameters: InputSchemaParameter[];
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

    // Register tool classes if not already registered
    // This is a lightweight operation that only registers class references
    if (toolRegistry.getAllClasses().length === 0) {
      await registerToolClasses();
    }

    // Get all registered tool classes (no instantiation needed!)
    // This matches Python's pattern: tool_list is list[type[BaseTool]]
    const toolClasses = toolRegistry.getAllClasses();

    // Build response - access static properties directly from classes
    // Equivalent to Python: [ToolMetadata(name=tool.name, name_frontend=tool.name_frontend) for tool in tool_list]
    const toolsResponse: ToolMetadata[] = toolClasses.map((ToolClass) => ({
      name: ToolClass.toolName,
      name_frontend: ToolClass.toolNameFrontend || ToolClass.toolName,
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
