// tests/utils.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect } from "vitest";
import {
  cn,
  convert_tools_to_set,
  isToolPart,
  isLastMessageComplete,
  getLastText,
  getToolInvocations,
  getLastMessageText,
  getStorageID,
  getValidationStatus,
  lastAssistantHasAllToolOutputs,
} from "@/lib/utils"; // adjust path if your project uses a different import alias

// --- Helper types for tests (loose shapes to match runtime checks) ---
type Part = { type: string; text?: string; state?: string; output?: any };
type MessageStrictShape = {
  role?: string;
  parts?: Part[];
  metadata?: { toolCalls?: any[] };
};

describe("cn", () => {
  test("merges class names with twMerge (overrides conflicting classes)", () => {
    // If clsx produces "text-sm text-lg", twMerge should reduce to "text-lg"
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  test("handles multiple inputs and falsy values correctly", () => {
    const result = cn("p-2", false && "block", "m-4");
    // falsy value should be ignored by clsx/twMerge
    expect(result).toBe("p-2 m-4");
  });
});

describe("convert_tools_to_set", () => {
  test("creates initial checked map with all tool slugs true and allchecked true", () => {
    const tools = [
      { slug: "tool-a", label: "Tool A" },
      { slug: "tool-b", label: "Tool B" },
    ];
    const set = convert_tools_to_set(tools);
    expect(set).toEqual({
      "tool-a": true,
      "tool-b": true,
      allchecked: true,
    });
  });

  test("works for empty input", () => {
    const set = convert_tools_to_set([]);
    expect(set).toEqual({ allchecked: true });
  });
});

describe("isToolPart", () => {
  test("returns true for parts whose type starts with 'tool-'", () => {
    const toolPart: Part = { type: "tool-run", output: "ok" };
    expect(isToolPart(toolPart as any)).toBe(true);
  });

  test("returns false for non-tool parts", () => {
    const textPart: Part = { type: "text", text: "hello" };
    expect(isToolPart(textPart as any)).toBe(false);
  });
});

describe("isLastMessageComplete", () => {
  test("returns true if metadata.toolCalls is empty or undefined", () => {
    const msg1: MessageStrictShape = { metadata: { toolCalls: [] } };
    const msg2: MessageStrictShape = {};
    expect(isLastMessageComplete(msg1 as any)).toBe(true);
    expect(isLastMessageComplete(msg2 as any)).toBe(true);
  });

  test("returns false if any tool call has isComplete === false", () => {
    const msg: MessageStrictShape = {
      metadata: {
        toolCalls: [
          { toolCallId: "1", isComplete: true },
          { toolCallId: "2", isComplete: false },
        ],
      },
    };
    expect(isLastMessageComplete(msg as any)).toBe(false);
  });

  test("returns true if all tool calls are complete (or missing isComplete)", () => {
    const msg: MessageStrictShape = {
      metadata: {
        toolCalls: [{ toolCallId: "1", isComplete: true }, { toolCallId: "2" }],
      },
    };
    // The function treats missing isComplete as not explicitly false, so returns true
    expect(isLastMessageComplete(msg as any)).toBe(true);
  });
});

describe("getLastText / getLastMessageText", () => {
  test("getLastText returns the last text part of a MessageStrict", () => {
    const message: MessageStrictShape = {
      parts: [
        { type: "text", text: "first" },
        { type: "something", text: "ignored" },
        { type: "text", text: "last" },
      ],
    };
    expect(getLastText(message as any)).toBe("last");
  });

  test("getLastText returns empty string if no text parts", () => {
    const message: MessageStrictShape = {
      parts: [{ type: "tool-run", output: "ok" }],
    };
    expect(getLastText(message as any)).toBe("");
  });

  test("getLastMessageText returns last message's last text", () => {
    const messages = [
      { role: "assistant", parts: [{ type: "text", text: "one" }] },
      {
        role: "assistant",
        parts: [
          { type: "text", text: "two" },
          { type: "text", text: "final" },
        ],
      },
    ];
    expect(getLastMessageText(messages as any)).toBe("final");
  });

  test("getLastMessageText returns empty string for empty messages", () => {
    expect(getLastMessageText([])).toBe("");
  });
});

describe("getToolInvocations", () => {
  test("extracts tool parts from a MessageStrict", () => {
    const msg: MessageStrictShape = {
      parts: [
        { type: "text", text: "hi" },
        { type: "tool-run", output: "ok" },
        { type: "tool-download", output: { id: 1 } },
      ],
    };
    const invocations = getToolInvocations(msg as any);
    expect(invocations.length).toBe(2);
    expect(invocations.map((p) => p.type)).toEqual([
      "tool-run",
      "tool-download",
    ]);
  });

  test("returns empty array for undefined or no tool parts", () => {
    expect(getToolInvocations(undefined)).toEqual([]);
    expect(
      getToolInvocations({ parts: [{ type: "text", text: "x" }] } as any),
    ).toEqual([]);
  });
});

describe("getStorageID", () => {
  test("returns storage ids when output is an object with storage_id array", () => {
    const toolCall: Part = {
      type: "tool-upload",
      state: "output-available",
      output: { storage_id: ["id1", "id2"] },
    };
    const ids = getStorageID(toolCall as any);
    expect(ids).toEqual(["id1", "id2"]);
  });

  test("returns single storage id when output.storage_id is a string", () => {
    const toolCall: Part = {
      type: "tool-upload",
      state: "output-available",
      output: { storage_id: "single-id" },
    };
    const ids = getStorageID(toolCall as any);
    expect(ids).toEqual(["single-id"]);
  });

  test("parses a JSON-string output and extracts storage_id", () => {
    const toolCall: Part = {
      type: "tool-upload",
      state: "output-available",
      output: JSON.stringify({ storage_id: "str-id" }),
    };
    const ids = getStorageID(toolCall as any);
    expect(ids).toEqual(["str-id"]);
  });

  test("returns empty array when not output-available or missing storage_id", () => {
    const wrongState: Part = {
      type: "tool-upload",
      state: "running",
      output: { storage_id: "x" },
    };
    expect(getStorageID(wrongState as any)).toEqual([]);

    const noStorageField: Part = {
      type: "tool-upload",
      state: "output-available",
      output: { foo: "bar" },
    };
    expect(getStorageID(noStorageField as any)).toEqual([]);

    const invalidJsonOutput: Part = {
      type: "tool-upload",
      state: "output-available",
      output: "{ not valid json",
    };
    // safeParse will return original string which doesn't have storage_id, so result is []
    expect(getStorageID(invalidJsonOutput as any)).toEqual([]);
  });
});

describe("getValidationStatus", () => {
  test("returns validated status for a matching toolCallId", () => {
    const metadata = {
      toolCalls: [
        { toolCallId: "a", validated: true },
        { toolCallId: "b", validated: false },
      ],
    };
    expect(getValidationStatus(metadata as any, "a")).toBe(true);
    expect(getValidationStatus(metadata as any, "b")).toBe(false);
  });

  test("returns undefined when not found", () => {
    const metadata = { toolCalls: [{ toolCallId: "x", validated: true }] };
    expect(getValidationStatus(metadata as any, "nope")).toBeUndefined();
    expect(getValidationStatus(undefined as any, "nope")).toBeUndefined();
  });
});

describe("lastAssistantHasAllToolOutputs", () => {
  test("returns false for invalid messages shape", () => {
    // Not an array
    // @ts-expect-error : since it is not an array, needed.
    expect(lastAssistantHasAllToolOutputs({ messages: null })).toBe(false);
  });

  test("returns false if last message is not assistant", () => {
    const useChatReturn = {
      messages: [
        {
          role: "user",
          parts: [{ type: "tool-a", state: "output-available", output: {} }],
        },
      ],
    };
    expect(lastAssistantHasAllToolOutputs(useChatReturn as any)).toBe(false);
  });

  test("returns false if last assistant message has trailing text", () => {
    const useChatReturn = {
      messages: [
        {
          role: "assistant",
          parts: [{ type: "text", text: "I am thinking..." }],
        },
      ],
    };
    expect(lastAssistantHasAllToolOutputs(useChatReturn as any)).toBe(false);
  });

  test("returns false if there are no tool parts", () => {
    const useChatReturn = {
      messages: [
        { role: "assistant", parts: [{ type: "something", text: "" }] },
      ],
    };
    expect(lastAssistantHasAllToolOutputs(useChatReturn as any)).toBe(false);
  });

  test("returns true when last assistant message has only tool parts and all have outputs or output-available state", () => {
    const useChatReturn = {
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "tool-a", state: "output-available", output: { foo: 1 } },
            { type: "tool-b", state: "output-available", output: "ok" },
          ],
        },
      ],
    };
    expect(lastAssistantHasAllToolOutputs(useChatReturn as any)).toBe(true);
  });

  test("returns true if parts have no 'state' but have truthy output", () => {
    const useChatReturn = {
      messages: [
        {
          role: "assistant",
          parts: [{ type: "tool-x", output: { something: 1 } }],
        },
      ],
    };
    expect(lastAssistantHasAllToolOutputs(useChatReturn as any)).toBe(true);
  });

  test("returns false if any tool part lacks output and is not output-available", () => {
    const useChatReturn = {
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "tool-a", state: "output-available", output: { ok: true } },
            { type: "tool-b", state: "running" }, // missing output
          ],
        },
      ],
    };
    expect(lastAssistantHasAllToolOutputs(useChatReturn as any)).toBe(false);
  });
});
