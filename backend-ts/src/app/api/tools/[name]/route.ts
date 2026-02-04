/**
 * Tool Metadata API Route
 *
 * Endpoint:
 * - GET /api/tools/{name} - Get detailed metadata for a specific tool
 *
 * Features:
 * - Returns detailed tool metadata including input schema
 * - Checks tool online status
 * - Authentication required
 * - Matches Python backend format
 *
 * Translated from backend/src/neuroagent/app/routers/tools.py:get_tool_metadata
 */

import { NextResponse, type NextRequest } from 'next/server';

import { validateAuth, AuthenticationError } from '@/lib/middleware/auth';
import { toolRegistry, registerToolClasses } from '@/lib/tools';

/**
 * Detailed tool metadata response - matches Python ToolMetadataDetailed
 */
interface ToolMetadataDetailed {
  name: string;
  name_frontend: string;
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
 * Extract input schema from Zod schema
 *
 * Converts a Zod schema to the input schema format expected by the frontend.
 * This matches Python's logic for extracting parameters from Pydantic models.
 *
 * @param zodSchema - The Zod schema to extract parameters from
 * @returns Input schema with parameters array
 */
function extractInputSchema(zodSchema: any): InputSchema {
  const parameters: InputSchemaParameter[] = [];

  try {
    // Get the shape of the Zod object schema
    if (zodSchema._def && zodSchema._def.shape) {
      const shape = zodSchema._def.shape();

      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        const field = fieldSchema as any;

        // Check if field is optional
        const isOptional = field._def?.typeName === 'ZodOptional';
        const innerSchema = isOptional ? field._def.innerType : field;

        // Get default value if present
        let defaultValue: string | null = null;
        if (innerSchema._def?.defaultValue !== undefined) {
          defaultValue = String(innerSchema._def.defaultValue());
        }

        // Get description from Zod schema
        const description = innerSchema._def?.description || '';

        parameters.push({
          name: fieldName,
          required: !isOptional,
          default: defaultValue,
          description,
        });
      }
    }
  } catch (error) {
    console.error('Error extracting input schema:', error);
  }

  return { parameters };
}

/**
 * GET /api/tools/{name}
 *
 * Returns detailed metadata for a specific tool including:
 * - Basic metadata (name, description, utterances)
 * - Input schema with parameter details
 * - Human-in-the-loop (HIL) requirement
 * - Online status
 *
 * Matches Python's get_tool_metadata() endpoint.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing tool name
 * @returns Tool metadata or error response
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    // Validate authentication (required like Python backend)
    await validateAuth(request);

    // Await params (Next.js 15 requirement)
    const { name } = await params;

    // Register tool classes if not already registered
    if (toolRegistry.getAllClasses().length === 0) {
      await registerToolClasses();
    }

    // Find the tool class by name
    const ToolClass = toolRegistry.getClass(name);

    if (!ToolClass) {
      return NextResponse.json({ error: `Tool '${name}' not found` }, { status: 404 });
    }

    // Check if tool is online
    // Like Python, we call the static isOnline method if available
    let isOnline = true;
    try {
      if (ToolClass.isOnline) {
        // TODO: Pass healthcheck context variables when available
        // For now, we call without context (tools that need context will default to true)
        isOnline = await ToolClass.isOnline({});
      }
    } catch (error) {
      console.error(`Error checking tool ${name} online status:`, error);
      isOnline = false;
    }

    // Extract input schema from the tool class
    // We need to instantiate temporarily to access the inputSchema
    // In Python, this is accessed via __annotations__["input_schema"]
    let inputSchema: InputSchema = { parameters: [] };

    try {
      // Create a minimal instance just to access the schema
      // This is safe because we're only reading the schema, not executing
      const tempInstance = new ToolClass({} as any);
      inputSchema = extractInputSchema(tempInstance.inputSchema);
    } catch (error) {
      console.error(`Error extracting input schema for tool ${name}:`, error);
    }

    // Build the detailed metadata response
    const metadata: ToolMetadataDetailed = {
      name: ToolClass.toolName,
      name_frontend: ToolClass.toolNameFrontend || ToolClass.toolName,
      description: ToolClass.toolDescription,
      description_frontend: ToolClass.toolDescriptionFrontend || ToolClass.toolDescription,
      utterances: ToolClass.toolUtterances || [],
      input_schema: JSON.stringify(inputSchema),
      hil: ToolClass.toolHil || false,
      is_online: isOnline,
    };

    return NextResponse.json(metadata);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: 'Authentication failed', message: error.message },
        { status: 401 }
      );
    }

    console.error('Error fetching tool metadata:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
