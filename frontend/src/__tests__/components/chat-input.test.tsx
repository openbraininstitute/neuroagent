import { expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "@/components/chat-input";
import { useActionState } from "react";

// Mock the server action to avoid env var requirements
vi.mock("@/actions/create-thread", () => ({
  createThreadWithMessage: vi.fn(),
}));

// Just provide the mock function without implementation
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

test("ChatInput renders and handles input", () => {
  const mockFormAction = vi.fn();
  vi.mocked(useActionState).mockImplementation(() => [
    null,
    mockFormAction,
    false,
  ]);

  render(<ChatInput />);

  const input = screen.getByPlaceholderText("Message the AI...");
  expect(input).toBeDefined();

  fireEvent.change(input, { target: { value: "Hello AI" } });
  expect(input).toHaveValue("Hello AI");

  const form = screen.getByTestId("chat-form");
  expect(form).toBeDefined();

  fireEvent.keyDown(input, { key: "Enter" });

  expect(mockFormAction).toHaveBeenCalled();
});

test("ChatInput shows loading state", () => {
  vi.mocked(useActionState).mockImplementation(() => [null, vi.fn(), true]);

  render(<ChatInput />);

  const input = screen.getByPlaceholderText("Creating thread...");
  expect(input).toBeDefined();

  const spinner = screen.getByTestId("loading-spinner");
  expect(spinner).toBeDefined();
});
