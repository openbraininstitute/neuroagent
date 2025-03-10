"use client";

import { useState, startTransition } from "react";
import { useActionState, useEffect } from "react";
import { createThread } from "@/actions/create-thread";
import { useStore } from "@/lib/store";
import { ToolSelectionDropdown } from "@/components/chat/tool-selection-dropdown";
import { Send } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import ChatInputLoading from "@/components/chat/chat-input-loading";
import { convert_tools_to_set } from "@/lib/utils";
import { OpenUserJourneyButton } from "./user-journey-dialog";
import QuestionSuggestionCards from "./question-suggestion-cards";
import { SuggestedQuestions } from "@/lib/types";
import { getSuggestions } from "@/actions/get-suggestions";

type ChatInputProps = {
  availableTools: Array<{ slug: string; label: string }>;
};

export function ChatInput({ availableTools }: ChatInputProps) {
  const newMessage = useStore((state) => state.newMessage);
  const setNewMessage = useStore((state) => state.setNewMessage);
  const checkedTools = useStore((state) => state.checkedTools);
  const setCheckedTools = useStore((state) => state.setCheckedTools);
  const [input, setInput] = useState("");

  const [, action, isPending] = useActionState(createThread, null);
  const [suggestionsState, querySuggestions, pendingSuggestions] =
    useActionState(getSuggestions, null);

  const actionWrapper = (suggestionInput?: string) => {
    if (!suggestionInput) {
      if (newMessage === "" && input !== "") {
        setNewMessage(input);
      }
    } else {
      setNewMessage(suggestionInput);
    }
    startTransition(action);
  };

  const suggestionActionWrapper = (suggestionInput: string[][][]) => {
    startTransition(() => querySuggestions(suggestionInput));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.shiftKey) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  };
  useEffect(() => {
    setCheckedTools(convert_tools_to_set(availableTools));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  return !isPending ? (
    <div className="flex flex-col items-center gap-4 pl-2 pr-2">
      <h1 className="text-2xl font-bold mt-4 mb-6">
        What can I help you with?
      </h1>
      <form
        data-testid="chat-form"
        action={() => actionWrapper()}
        onSubmit={(e) => {
          if (!input.trim()) {
            e.preventDefault();
            return;
          }
          setInput("");
        }}
        className="w-full flex justify-center"
      >
        <div className="min-w-[70%] max-w-[100%]">
          <div className="flex items-center border-2  border-gray-500 rounded-[3vw] overflow-hidden min-h-16">
            <TextareaAutosize
              name="content"
              autoComplete="off"
              className="flex-grow outline-none border-none bg-transparent pl-6 resize-none"
              placeholder={
                isPending ? "Creating thread..." : "Message the AI..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              disabled={isPending}
              maxRows={10}
            />
            <div className="flex gap-2 mr-3">
              <OpenUserJourneyButton
                querySuggestions={suggestionActionWrapper}
                pendingSuggestions={pendingSuggestions}
              />
              <ToolSelectionDropdown
                availableTools={availableTools}
                checkedTools={checkedTools}
                setCheckedTools={setCheckedTools}
              />
              {isPending ? (
                <div
                  className="w-6 h-6 border-2 ml-2 p-1 border-gray-500 border-t-transparent rounded-full animate-spin"
                  data-testid="loading-spinner"
                />
              ) : (
                <button type="submit" data-testid="send-button" className="p-1">
                  <Send className="opacity-50" />
                </button>
              )}
            </div>
          </div>
          <QuestionSuggestionCards
            suggestions={suggestionsState as SuggestedQuestions}
            onSubmit={actionWrapper}
          />
        </div>
      </form>
    </div>
  ) : (
    <ChatInputLoading newMessage={newMessage} />
  );
}
