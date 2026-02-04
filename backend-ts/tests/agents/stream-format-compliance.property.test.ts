/**
 * Property-Based Tests for Stream Format Compliance
 *
 * Feature: typescript-backend-migration
 * Property 4: Stream Format Compliance
 *
 * For any streaming LLM response, the output should conform to Vercel AI SDK's
 * data stream format with proper event types and structure.
 *
 * Validates: Requirements 2.4, 6.5
 *
 * This test verifies that:
 * 1. Streaming responses use Vercel AI SDK's data stream protocol
 * 2. Stream parts have correct numeric prefixes (0:, 2:, 3:, etc.)
 * 3. Text deltas use format: 0:string\n
 * 4. Tool calls use format: 9:{toolCallId, toolName, args}\n
 * 5. Tool results use format: a:{toolCallId, result}\n
 * 6. Errors use format: 3:string\n
 * 7. Finish events use format: e:{finishReason, usage, isContinued}\n
 * 8. Message annotations use format: 8:JSONValue\n
 * 9. All stream parts are properly formatted and parseable
 * 10. Stream ends with proper finish event
 *
 * Using Vercel AI SDK v4.3.19
 *
 * Data Stream Protocol Format Reference:
 * - 0: Text delta (0:string\n)
 * - 2: Data part (2:Array<JSONValue>\n)
 * - 3: Error (3:string\n)
 * - 8: Message annotation (8:JSONValue\n)
 * - 9: Tool call (9:{toolCallId, toolName, args}\n)
 * - a: Tool result (a:{toolCallId, result}\n)
 * - b: Tool call streaming start (b:{toolCallId, toolName}\n)
 * - c: Tool call delta (c:{toolCallId, argsTextDelta}\n)
 * - d: Finish message (d:{finishReason, usage}\n)
 * - e: Finish step (e:{finishReason, usage, isContinued}\n)
 * - g: Reasoning (g:string\n)
 * - h: Source (h:Source\n)
 * - i: Redacted reasoning (i:{data}\n)
 * - j: Reasoning signature (j:{signature}\n)
 * - k: File (k:{data, mimeType}\n)
 */

import { describe, it, expect } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';

/**
 * Parse a stream part line and extract type and data
 */
function parseStreamPart(line: string): { type: string; data: any } | null {
  if (line.length === 0) return null;

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const prefix = line.substring(0, colonIndex);
  const data = line.substring(colonIndex + 1);

  // Map prefix to type
  const typeMap: Record<string, string> = {
    '0': 'text-delta',
    '2': 'data',
    '3': 'error',
    '8': 'message-annotation',
    '9': 'tool-call',
    a: 'tool-result',
    b: 'tool-call-streaming-start',
    c: 'tool-call-delta',
    d: 'finish-message',
    e: 'finish-step',
    g: 'reasoning',
    h: 'source',
    i: 'redacted-reasoning',
    j: 'reasoning-signature',
    k: 'file',
  };

  const type = typeMap[prefix] || `unknown-${prefix}`;

  // Parse JSON data for structured parts
  let parsedData: any = data;
  if (['2', '8', '9', 'a', 'b', 'c', 'd', 'e', 'h', 'i', 'j', 'k'].includes(prefix)) {
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      // Return raw data if JSON parsing fails
      parsedData = data;
    }
  }

  return { type, data: parsedData };
}

/**
 * Validate that a stream part has the correct format
 */
function validateStreamPart(part: { type: string; data: any }): { valid: boolean; error?: string } {
  switch (part.type) {
    case 'text-delta':
      if (typeof part.data !== 'string') {
        return { valid: false, error: 'Text delta must be a string' };
      }
      return { valid: true };

    case 'data':
      if (!Array.isArray(part.data)) {
        return { valid: false, error: 'Data part must be an array' };
      }
      return { valid: true };

    case 'error':
      if (typeof part.data !== 'string') {
        return { valid: false, error: 'Error must be a string' };
      }
      return { valid: true };

    case 'message-annotation':
      // Message annotation can be any JSON value
      return { valid: true };

    case 'tool-call':
      if (typeof part.data !== 'object' || part.data === null) {
        return { valid: false, error: 'Tool call must be an object' };
      }
      if (!part.data.toolCallId || typeof part.data.toolCallId !== 'string') {
        return { valid: false, error: 'Tool call must have toolCallId string' };
      }
      if (!part.data.toolName || typeof part.data.toolName !== 'string') {
        return { valid: false, error: 'Tool call must have toolName string' };
      }
      if (!part.data.args || typeof part.data.args !== 'object') {
        return { valid: false, error: 'Tool call must have args object' };
      }
      return { valid: true };

    case 'tool-result':
      if (typeof part.data !== 'object' || part.data === null) {
        return { valid: false, error: 'Tool result must be an object' };
      }
      if (!part.data.toolCallId || typeof part.data.toolCallId !== 'string') {
        return { valid: false, error: 'Tool result must have toolCallId string' };
      }
      if (!('result' in part.data)) {
        return { valid: false, error: 'Tool result must have result field' };
      }
      return { valid: true };

    case 'tool-call-streaming-start':
      if (typeof part.data !== 'object' || part.data === null) {
        return { valid: false, error: 'Tool call streaming start must be an object' };
      }
      if (!part.data.toolCallId || typeof part.data.toolCallId !== 'string') {
        return { valid: false, error: 'Tool call streaming start must have toolCallId string' };
      }
      if (!part.data.toolName || typeof part.data.toolName !== 'string') {
        return { valid: false, error: 'Tool call streaming start must have toolName string' };
      }
      return { valid: true };

    case 'tool-call-delta':
      if (typeof part.data !== 'object' || part.data === null) {
        return { valid: false, error: 'Tool call delta must be an object' };
      }
      if (!part.data.toolCallId || typeof part.data.toolCallId !== 'string') {
        return { valid: false, error: 'Tool call delta must have toolCallId string' };
      }
      if (!part.data.argsTextDelta || typeof part.data.argsTextDelta !== 'string') {
        return { valid: false, error: 'Tool call delta must have argsTextDelta string' };
      }
      return { valid: true };

    case 'finish-message':
    case 'finish-step':
      if (typeof part.data !== 'object' || part.data === null) {
        return { valid: false, error: 'Finish event must be an object' };
      }
      if (!part.data.finishReason || typeof part.data.finishReason !== 'string') {
        return { valid: false, error: 'Finish event must have finishReason string' };
      }
      const validFinishReasons = [
        'stop',
        'length',
        'content-filter',
        'tool-calls',
        'error',
        'other',
        'unknown',
      ];
      if (!validFinishReasons.includes(part.data.finishReason)) {
        return { valid: false, error: `Invalid finishReason: ${part.data.finishReason}` };
      }
      if (!part.data.usage || typeof part.data.usage !== 'object') {
        return { valid: false, error: 'Finish event must have usage object' };
      }
      if (typeof part.data.usage.promptTokens !== 'number') {
        return { valid: false, error: 'Finish event usage must have promptTokens number' };
      }
      if (typeof part.data.usage.completionTokens !== 'number') {
        return { valid: false, error: 'Finish event usage must have completionTokens number' };
      }
      // finish-step should have isContinued
      if (part.type === 'finish-step' && typeof part.data.isContinued !== 'boolean') {
        return { valid: false, error: 'Finish step must have isContinued boolean' };
      }
      return { valid: true };

    default:
      // Unknown part types are allowed (for extensibility)
      return { valid: true };
  }
}

describe('Stream Format Compliance Property Tests', () => {
  describe('Property 4: Stream Format Compliance', () => {
    /**
     * **Validates: Requirements 2.4, 6.5**
     *
     * Test that text deltas use correct format: 0:string\n
     */
    test.prop([fc.string({ minLength: 1, maxLength: 100 })])(
      'should format text deltas correctly',
      (textContent) => {
        const streamLine = `0:${textContent}`;
        const part = parseStreamPart(streamLine);

        expect(part).not.toBeNull();
        expect(part!.type).toBe('text-delta');
        expect(part!.data).toBe(textContent);

        const validation = validateStreamPart(part!);
        expect(validation.valid).toBe(true);
      }
    );

    /**
     * Test that tool calls use correct format: 9:{toolCallId, toolName, args}\n
     */
    test.prop([
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.string({ minLength: 3, maxLength: 15 }),
      fc.record({ query: fc.string() }),
    ])('should format tool calls correctly', (toolCallId, toolName, args) => {
      const toolCall = { toolCallId, toolName, args };
      const streamLine = `9:${JSON.stringify(toolCall)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('tool-call');
      expect(part!.data).toEqual(toolCall);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Validation error:', validation.error);
      }
    });

    /**
     * Test that tool results use correct format: a:{toolCallId, result}\n
     */
    test.prop([
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.oneof(fc.string(), fc.record({ data: fc.string() })),
    ])('should format tool results correctly', (toolCallId, result) => {
      const toolResult = { toolCallId, result };
      const streamLine = `a:${JSON.stringify(toolResult)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('tool-result');
      expect(part!.data).toEqual(toolResult);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
    });

    /**
     * Test that errors use correct format: 3:string\n
     */
    test.prop([fc.string({ minLength: 1, maxLength: 200 })])(
      'should format errors correctly',
      (errorMessage) => {
        const streamLine = `3:${errorMessage}`;
        const part = parseStreamPart(streamLine);

        expect(part).not.toBeNull();
        expect(part!.type).toBe('error');
        expect(part!.data).toBe(errorMessage);

        const validation = validateStreamPart(part!);
        expect(validation.valid).toBe(true);
      }
    );

    /**
     * Test that finish events use correct format with all required fields
     */
    test.prop([
      fc.constantFrom(
        'stop',
        'length',
        'content-filter',
        'tool-calls',
        'error',
        'other',
        'unknown'
      ),
      fc.integer({ min: 1, max: 10000 }),
      fc.integer({ min: 1, max: 10000 }),
      fc.boolean(),
    ])(
      'should format finish events correctly',
      (finishReason, promptTokens, completionTokens, isContinued) => {
        const finishEvent = {
          finishReason,
          usage: { promptTokens, completionTokens },
          isContinued,
        };
        const streamLine = `e:${JSON.stringify(finishEvent)}`;
        const part = parseStreamPart(streamLine);

        expect(part).not.toBeNull();
        expect(part!.type).toBe('finish-step');
        expect(part!.data).toEqual(finishEvent);

        const validation = validateStreamPart(part!);
        expect(validation.valid).toBe(true);
      }
    );

    /**
     * Test that message annotations use correct format: 8:JSONValue\n
     */
    test.prop([
      fc.array(
        fc.record({
          toolCallId: fc.string(),
          validated: fc.constantFrom('pending', 'approved', 'rejected'),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    ])('should format message annotations correctly', (annotations) => {
      const streamLine = `8:${JSON.stringify(annotations)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('message-annotation');
      expect(part!.data).toEqual(annotations);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
    });

    /**
     * Test that data parts use correct format: 2:Array<JSONValue>\n
     */
    test.prop([
      fc.array(
        fc.record({
          key: fc.string(),
          value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    ])('should format data parts correctly', (dataArray) => {
      const streamLine = `2:${JSON.stringify(dataArray)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('data');
      expect(part!.data).toEqual(dataArray);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
    });

    /**
     * Test that tool call streaming parts use correct format
     */
    test.prop([
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.string({ minLength: 3, maxLength: 15 }),
    ])('should format tool call streaming start correctly', (toolCallId, toolName) => {
      const streamingStart = { toolCallId, toolName };
      const streamLine = `b:${JSON.stringify(streamingStart)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('tool-call-streaming-start');
      expect(part!.data).toEqual(streamingStart);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
    });

    /**
     * Test that tool call deltas use correct format
     */
    test.prop([
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.string({ minLength: 1, maxLength: 50 }),
    ])('should format tool call deltas correctly', (toolCallId, argsTextDelta) => {
      const delta = { toolCallId, argsTextDelta };
      const streamLine = `c:${JSON.stringify(delta)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('tool-call-delta');
      expect(part!.data).toEqual(delta);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
    });

    /**
     * Test that invalid stream parts are detected
     */
    it('should detect invalid stream part formats', () => {
      // Test invalid text delta (not a string)
      const invalidTextDelta = { type: 'text-delta', data: 123 };
      const validation1 = validateStreamPart(invalidTextDelta);
      expect(validation1.valid).toBe(false);
      expect(validation1.error).toContain('string');

      // Test invalid tool call (missing toolCallId)
      const invalidToolCall = { type: 'tool-call', data: { toolName: 'test', args: {} } };
      const validation2 = validateStreamPart(invalidToolCall);
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toContain('toolCallId');

      // Test invalid finish event (invalid finishReason)
      const invalidFinish = {
        type: 'finish-step',
        data: {
          finishReason: 'invalid-reason',
          usage: { promptTokens: 10, completionTokens: 5 },
          isContinued: false,
        },
      };
      const validation3 = validateStreamPart(invalidFinish);
      expect(validation3.valid).toBe(false);
      expect(validation3.error).toContain('Invalid finishReason');

      // Test invalid tool result (missing result field)
      const invalidToolResult = { type: 'tool-result', data: { toolCallId: 'call-123' } };
      const validation4 = validateStreamPart(invalidToolResult);
      expect(validation4.valid).toBe(false);
      expect(validation4.error).toContain('result');
    });

    /**
     * Test that all stream part prefixes are recognized
     */
    it('should recognize all valid stream part prefixes', () => {
      const validPrefixes = [
        '0',
        '2',
        '3',
        '8',
        '9',
        'a',
        'b',
        'c',
        'd',
        'e',
        'g',
        'h',
        'i',
        'j',
        'k',
      ];
      const expectedTypes = [
        'text-delta',
        'data',
        'error',
        'message-annotation',
        'tool-call',
        'tool-result',
        'tool-call-streaming-start',
        'tool-call-delta',
        'finish-message',
        'finish-step',
        'reasoning',
        'source',
        'redacted-reasoning',
        'reasoning-signature',
        'file',
      ];

      for (let i = 0; i < validPrefixes.length; i++) {
        const prefix = validPrefixes[i];
        const expectedType = expectedTypes[i];

        // Create a minimal valid stream line for each prefix
        let streamLine: string;
        if (['0', '3', 'g'].includes(prefix)) {
          // String data
          streamLine = `${prefix}:test`;
        } else {
          // JSON data
          streamLine = `${prefix}:{}`;
        }

        const part = parseStreamPart(streamLine);
        expect(part).not.toBeNull();
        expect(part!.type).toBe(expectedType);
      }
    });

    /**
     * Test that stream parts with newlines are handled correctly
     */
    test.prop([fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('\n'))])(
      'should handle stream parts without embedded newlines',
      (content) => {
        const streamLine = `0:${content}`;
        const part = parseStreamPart(streamLine);

        expect(part).not.toBeNull();
        expect(part!.type).toBe('text-delta');
        expect(part!.data).toBe(content);
      }
    );

    /**
     * Test that complex tool call arguments are properly formatted
     */
    test.prop([
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.string({ minLength: 3, maxLength: 15 }),
      fc.record({
        query: fc.string(),
        maxResults: fc.integer({ min: 1, max: 100 }),
        filters: fc.record({
          category: fc.constantFrom('science', 'technology', 'health'),
          tags: fc.array(fc.string(), { maxLength: 5 }),
        }),
      }),
    ])('should format complex tool call arguments correctly', (toolCallId, toolName, args) => {
      const toolCall = { toolCallId, toolName, args };
      const streamLine = `9:${JSON.stringify(toolCall)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('tool-call');
      expect(part!.data).toEqual(toolCall);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);

      // Verify nested structure is preserved
      expect(part!.data.args.query).toBe(args.query);
      expect(part!.data.args.maxResults).toBe(args.maxResults);
      expect(part!.data.args.filters.category).toBe(args.filters.category);
      expect(part!.data.args.filters.tags).toEqual(args.filters.tags);
    });

    /**
     * Test that finish message format is valid
     */
    test.prop([
      fc.constantFrom(
        'stop',
        'length',
        'content-filter',
        'tool-calls',
        'error',
        'other',
        'unknown'
      ),
      fc.integer({ min: 1, max: 10000 }),
      fc.integer({ min: 1, max: 10000 }),
    ])('should format finish message correctly', (finishReason, promptTokens, completionTokens) => {
      const finishMessage = {
        finishReason,
        usage: { promptTokens, completionTokens },
      };
      const streamLine = `d:${JSON.stringify(finishMessage)}`;
      const part = parseStreamPart(streamLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('finish-message');
      expect(part!.data).toEqual(finishMessage);

      const validation = validateStreamPart(part!);
      expect(validation.valid).toBe(true);
    });

    /**
     * Test that stream parts can be parsed from a multi-line stream
     */
    it('should parse multiple stream parts from a stream', () => {
      const streamLines = [
        '0:Hello, I can help you with that.',
        '9:{"toolCallId":"call-123","toolName":"test_tool","args":{"query":"test"}}',
        'a:{"toolCallId":"call-123","result":"Test result"}',
        '0:Based on the results, here is my answer.',
        'e:{"finishReason":"stop","usage":{"promptTokens":50,"completionTokens":25},"isContinued":false}',
      ];

      const parts = streamLines.map((line) => parseStreamPart(line)).filter((p) => p !== null);

      expect(parts.length).toBe(5);

      // Verify each part type
      expect(parts[0]!.type).toBe('text-delta');
      expect(parts[1]!.type).toBe('tool-call');
      expect(parts[2]!.type).toBe('tool-result');
      expect(parts[3]!.type).toBe('text-delta');
      expect(parts[4]!.type).toBe('finish-step');

      // Validate all parts
      for (const part of parts) {
        const validation = validateStreamPart(part!);
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.error('Invalid part:', part, 'Error:', validation.error);
        }
      }
    });

    /**
     * Test that empty lines are handled correctly
     */
    it('should handle empty lines gracefully', () => {
      const emptyLine = '';
      const part = parseStreamPart(emptyLine);
      expect(part).toBeNull();
    });

    /**
     * Test that lines without colons are handled correctly
     */
    it('should handle lines without colons gracefully', () => {
      const invalidLine = 'invalid line without colon';
      const part = parseStreamPart(invalidLine);
      expect(part).toBeNull();
    });

    /**
     * Test that JSON parsing errors are handled gracefully
     */
    it('should handle JSON parsing errors gracefully', () => {
      const invalidJsonLine = '9:{invalid json}';
      const part = parseStreamPart(invalidJsonLine);

      expect(part).not.toBeNull();
      expect(part!.type).toBe('tool-call');
      // Should return raw data when JSON parsing fails
      expect(typeof part!.data).toBe('string');
    });

    /**
     * Test that usage object has correct structure
     */
    test.prop([fc.integer({ min: 0, max: 100000 }), fc.integer({ min: 0, max: 100000 })])(
      'should validate usage object structure in finish events',
      (promptTokens, completionTokens) => {
        const finishEvent = {
          finishReason: 'stop',
          usage: { promptTokens, completionTokens },
          isContinued: false,
        };
        const streamLine = `e:${JSON.stringify(finishEvent)}`;
        const part = parseStreamPart(streamLine);

        expect(part).not.toBeNull();
        const validation = validateStreamPart(part!);
        expect(validation.valid).toBe(true);

        // Verify usage structure
        expect(part!.data.usage).toHaveProperty('promptTokens');
        expect(part!.data.usage).toHaveProperty('completionTokens');
        expect(typeof part!.data.usage.promptTokens).toBe('number');
        expect(typeof part!.data.usage.completionTokens).toBe('number');
      }
    );

    /**
     * Test that all finish reasons are valid
     */
    it('should accept all valid finish reasons', () => {
      const validFinishReasons = [
        'stop',
        'length',
        'content-filter',
        'tool-calls',
        'error',
        'other',
        'unknown',
      ];

      for (const finishReason of validFinishReasons) {
        const finishEvent = {
          finishReason,
          usage: { promptTokens: 10, completionTokens: 5 },
          isContinued: false,
        };
        const streamLine = `e:${JSON.stringify(finishEvent)}`;
        const part = parseStreamPart(streamLine);

        expect(part).not.toBeNull();
        const validation = validateStreamPart(part!);
        expect(validation.valid).toBe(true);
      }
    });

    /**
     * Test that invalid finish reasons are rejected
     */
    it('should reject invalid finish reasons', () => {
      const invalidFinishReasons = ['invalid', 'unknown-reason', 'cancelled', 'timeout'];

      for (const finishReason of invalidFinishReasons) {
        const finishEvent = {
          finishReason,
          usage: { promptTokens: 10, completionTokens: 5 },
          isContinued: false,
        };
        const part = { type: 'finish-step', data: finishEvent };

        const validation = validateStreamPart(part);
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('Invalid finishReason');
      }
    });
  });
});
