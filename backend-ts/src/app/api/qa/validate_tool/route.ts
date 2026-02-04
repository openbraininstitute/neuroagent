/**
 * Tool Validation API Route
 *
 * This endpoint handles Human-in-the-Loop (HIL) tool validation.
 * When a tool requires explicit user validation, the frontend sends
 * the validated inputs to this endpoint, which then:
 * 1. Updates the tool call's validated status in the database
 * 2. Executes the tool with the validated inputs
 * 3. Saves the tool result to the database
 * 4. Returns the result to the frontend
 *
 * Requirements: 5.8
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { toolRegistry } from '@/lib/tools/base-tool';
import { Entity } from '@/types';

/**
 * Request schema for tool validation
 */
const ValidateToolRequestSchema = z.object({
  toolCallId: z.string().describe('The tool call ID to validate'),
  validatedInputs: z.record(z.any()).describe('The validated inputs for the tool'),
  isValidated: z
    .boolean()
    .describe('Whether the tool call is validated (true) or rejected (false)'),
});

/**
 * POST /api/qa/validate_tool
 *
 * Validate and execute a tool that requires Human-in-the-Loop validation.
 *
 * Request body:
 * {
 *   "toolCallId": "call_abc123",
 *   "validatedInputs": { "query": "validated query" },
 *   "isValidated": true
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "result": "tool execution result"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationRequest = ValidateToolRequestSchema.parse(body);

    // Find the tool call in the database
    const toolCall = await prisma.toolCall.findUnique({
      where: { id: validationRequest.toolCallId },
      include: {
        message: true,
      },
    });

    if (!toolCall) {
      console.error('[validate_tool] Tool call not found:', validationRequest.toolCallId);
      return NextResponse.json({ error: 'Tool call not found' }, { status: 404 });
    }

    // Check if tool call is already validated
    if (toolCall.validated !== null) {
      console.error('[validate_tool] Tool call already validated:', {
        toolCallId: validationRequest.toolCallId,
        validated: toolCall.validated,
      });
      return NextResponse.json({ error: 'Tool call already validated' }, { status: 400 });
    }

    // Update the tool call's validated status
    await prisma.toolCall.update({
      where: { id: validationRequest.toolCallId },
      data: { validated: validationRequest.isValidated },
    });

    // If rejected, return early
    if (!validationRequest.isValidated) {
      // Save rejection message to database
      await prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          creationDate: new Date(),
          threadId: toolCall.message.threadId,
          entity: Entity.TOOL,
          content: JSON.stringify({
            role: 'tool',
            tool_call_id: toolCall.id,
            tool_name: toolCall.name,
            content: 'Tool execution rejected by user.',
          }),
          isComplete: true,
        },
      });

      return NextResponse.json({
        success: true,
        result: 'Tool execution rejected by user.',
      });
    }

    // Get the tool class from registry
    const ToolClass = toolRegistry.getClass(toolCall.name);
    if (!ToolClass) {
      console.error('[validate_tool] Tool not found in registry:', toolCall.name);
      return NextResponse.json({ error: `Tool "${toolCall.name}" not found` }, { status: 404 });
    }

    // Instantiate the tool with context variables
    // TODO: Get proper context variables from settings/request
    const contextVariables = {
      // Add necessary context variables here
      // This should match what's used in the chat_streamed route
    };
    const toolInstance = new ToolClass(contextVariables);

    // Execute the tool with validated inputs
    let result: any;
    try {
      result = await toolInstance.execute(validationRequest.validatedInputs);
    } catch (error) {
      console.error('[validate_tool] Tool execution failed:', error);
      result = `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Save the tool result to the database
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        creationDate: new Date(),
        threadId: toolCall.message.threadId,
        entity: Entity.TOOL,
        content: JSON.stringify({
          role: 'tool',
          tool_call_id: toolCall.id,
          tool_name: toolCall.name,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        }),
        isComplete: true,
      },
    });

    return NextResponse.json({
      success: true,
      result: typeof result === 'string' ? result : JSON.stringify(result),
    });
  } catch (error) {
    console.error('[validate_tool] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
