import { describe, expect, test, beforeEach } from "vitest";
import {
  cn,
  convert_tools_to_set,
  isLastMessageComplete,
  getToolInvocations,
  getStorageID,
  getValidationStatus,
  getStoppedStatus,
} from "@/lib/utils";
import type { MessageStrict, Annotation } from "@/lib/types";
import type { ToolInvocationUIPart } from "@ai-sdk/ui-utils";

describe("cn", () => {
  test("merges class names with twMerge (e.g., overrides conflicting classes)", () => {
    // If clsx produces "text-sm text-lg", twMerge should reduce to "text-lg"
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  test("handles multiple inputs and falsy values correctly", () => {
    const result = cn("p-2", false && "block", "m-4");
    expect(result).toBe("p-2 m-4");
  });
});

describe("convert_tools_to_set", () => {
  test("returns an object with each slug set to true and adds allchecked: true", () => {
    const availableTools = [
      { slug: "alpha", label: "Alpha Tool" },
      { slug: "beta", label: "Beta Tool" },
    ];
    const result = convert_tools_to_set(availableTools);
    expect(result).toEqual({
      alpha: true,
      beta: true,
      allchecked: true,
    });
  });

  test("works for an empty array of availableTools", () => {
    const result = convert_tools_to_set([]);
    expect(result).toEqual({ allchecked: true });
  });
});

describe("isLastMessageComplete", () => {
  test("returns true when `messages` is undefined", () => {
    expect(isLastMessageComplete(undefined)).toBe(true);
  });

  test("returns true when annotations array is empty", () => {
    const msg = { annotations: [] } as unknown as MessageStrict;
    expect(isLastMessageComplete(msg)).toBe(true);
  });

  test("returns false if any annotation has isComplete === false", () => {
    const msg = {
      annotations: [{ isComplete: true }, { isComplete: false }],
    } as MessageStrict;
    expect(isLastMessageComplete(msg)).toBe(false);
  });

  test("returns true if all annotations are complete", () => {
    const msg = {
      annotations: [{ isComplete: true }, { isComplete: true }],
    } as MessageStrict;
    expect(isLastMessageComplete(msg)).toBe(true);
  });
});

describe("getToolInvocations", () => {
  test("extracts toolInvocation objects from parts where type === 'tool-invocation'", () => {
    // We force-cast to ToolInvocationUIPart via unknown to satisfy the compiler
    const fakeInvocation = { id: "inv-1", name: "fake-tool" };
    const part = {
      type: "tool-invocation",
      toolInvocation: fakeInvocation,
    } as unknown as ToolInvocationUIPart;

    // Similarly, cast the entire message to MessageStrict via unknown
    const message = {
      parts: [part, { type: "text", text: "just text" }],
    } as unknown as MessageStrict;

    const invocations = getToolInvocations(message);
    expect(invocations).toEqual([fakeInvocation]);
  });

  test("returns an empty array when message or parts is undefined", () => {
    expect(getToolInvocations(undefined)).toEqual([]);

    // Cast through unknown so that MessageStrict with undefined parts compiles
    const msgNoParts = { parts: undefined } as unknown as MessageStrict;
    expect(getToolInvocations(msgNoParts)).toEqual([]);
  });
});
describe("getStorageID", () => {
  test("extracts a single storage_id from a JSON string", () => {
    const toolCall = {
      type: "tool-invocation",
      toolInvocation: {
        state: "result",
        result: JSON.stringify({ storage_id: "abc-123" }),
      },
    } as ToolInvocationUIPart;

    const ids = getStorageID(toolCall);
    expect(ids).toEqual(["abc-123"]);
  });

  test("extracts multiple storage_ids from an object", () => {
    const toolCall = {
      type: "tool-invocation",
      toolInvocation: {
        state: "result",
        result: { storage_id: ["id1", "id2"] },
      },
    } as ToolInvocationUIPart;

    const ids = getStorageID(toolCall);
    expect(ids).toEqual(["id1", "id2"]);
  });

  test("returns an empty array if result is invalid JSON string", () => {
    const toolCall = {
      type: "tool-invocation",
      toolInvocation: {
        state: "result",
        result: "not json",
      },
    } as ToolInvocationUIPart;

    const ids = getStorageID(toolCall);
    expect(ids).toEqual([]);
  });

  test("returns an empty array if storage_id is missing", () => {
    const toolCall = {
      type: "tool-invocation",
      toolInvocation: {
        state: "result",
        result: { some_other_field: "value" },
      },
    } as ToolInvocationUIPart;

    const ids = getStorageID(toolCall);
    expect(ids).toEqual([]);
  });

  test("returns empty array if toolCall is undefined", () => {
    const ids = getStorageID(undefined);
    expect(ids).toEqual([]);
  });

  test("returns empty array if type is not 'tool-invocation'", () => {
    const toolCall = {
      type: "not-a-tool-invocation",
      toolInvocation: {
        state: "result",
        result: { storage_id: "abc-123" },
      },
    } as unknown as ToolInvocationUIPart;

    const ids = getStorageID(toolCall);
    expect(ids).toEqual([]);
  });
});

describe("getValidationStatus", () => {
  let annotations: Annotation[];

  beforeEach(() => {
    annotations = [
      { toolCallId: "toolA", validated: "accepted" } as Annotation,
      { toolCallId: "toolB", validated: "rejected" } as Annotation,
    ];
  });

  test("returns the correct validated value when annotation is found", () => {
    expect(getValidationStatus(annotations, "toolA")).toBe("accepted");
    expect(getValidationStatus(annotations, "toolB")).toBe("rejected");
  });

  test("returns undefined when annotation with given toolCallId does not exist", () => {
    expect(getValidationStatus(annotations, "nonexistent")).toBeUndefined();
  });

  test("returns undefined when annotations array is undefined", () => {
    expect(getValidationStatus(undefined, "toolA")).toBeUndefined();
  });
});

describe("getStoppedStatus", () => {
  let annotations: Annotation[];

  beforeEach(() => {
    annotations = [
      { toolCallId: "tool1", isComplete: false } as Annotation,
      { toolCallId: "tool2", isComplete: true } as Annotation,
    ];
  });

  test("returns true when annotation.isComplete is false", () => {
    expect(getStoppedStatus(annotations, "tool1")).toBe(true);
  });

  test("returns false when annotation.isComplete is true", () => {
    expect(getStoppedStatus(annotations, "tool2")).toBe(false);
  });

  test("returns false when annotation is missing (undefined)", () => {
    expect(getStoppedStatus(annotations, "missingTool")).toBe(false);
  });

  test("returns false when annotations array is undefined", () => {
    expect(getStoppedStatus(undefined, "tool1")).toBe(false);
  });
});
