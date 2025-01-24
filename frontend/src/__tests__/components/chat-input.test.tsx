import { expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "@/components/chat-input";

// Mock the server action
vi.mock("@/actions/create-thread", () => ({
  createThreadWithMessage: vi.fn(),
}));

let mockActionState = [null, vi.fn(), false];

// Mock useActionState hook
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useActionState: () => mockActionState,
  };
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  mockActionState = [null, vi.fn(), false];
});

test("ChatInput renders and handles input", () => {
  render(<ChatInput />);

  // Get the input element
  const input = screen.getByPlaceholderText("Message the AI...");
  expect(input).toBeDefined();

  // Test input change
  fireEvent.change(input, { target: { value: "Hello AI" } });
  expect(input).toHaveValue("Hello AI");

  // Test form submission on Enter
  const form = screen.getByTestId("chat-form");
  expect(form).toBeDefined();

  fireEvent.keyDown(input, { key: "Enter" });
});

test("ChatInput shows loading state", () => {
  mockActionState = [null, vi.fn(), true];

  render(<ChatInput />);

  // Check if loading placeholder is shown
  const input = screen.getByPlaceholderText("Creating thread...");
  expect(input).toBeDefined();

  // Check if loading spinner is visible
  const spinner = screen.getByTestId("loading-spinner");
  expect(spinner).toBeDefined();
});
