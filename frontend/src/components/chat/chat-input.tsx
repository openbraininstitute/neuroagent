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
import { OpenUserJourneyButton } from "@/components/chat/user-journey-dialog";
import QuestionSuggestionCards from "@/components/chat/question-suggestion-cards";
import { LLMModel, BQuestionsSuggestions, BUserJourney } from "@/lib/types";
import { getSuggestions } from "@/actions/get-suggestions";
import { ModelSelectionDropdown } from "./model-selection";

type ChatInputProps = {
  availableTools: Array<{ slug: string; label: string }>;
  availableModels: Array<LLMModel>;
};

export function ChatInput({ availableTools, availableModels }: ChatInputProps) {
  const newMessage = useStore((state) => state.newMessage);
  const setNewMessage = useStore((state) => state.setNewMessage);
  const checkedTools = useStore((state) => state.checkedTools);
  const setCheckedTools = useStore((state) => state.setCheckedTools);
  const currentModel = useStore((state) => state.currentModel);
  const setCurrentModel = useStore((state) => state.setCurrentModel);
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

  const suggestionActionWrapper = (suggestionInput: BUserJourney) => {
    startTransition(() => querySuggestions(suggestionInput));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  useEffect(() => {
    if (Object.keys(checkedTools).length === 0) {
      setCheckedTools(convert_tools_to_set(availableTools));
    }
  }, []);

  return !isPending ? (
    <div className="m-5 flex h-[100%] flex-col items-center justify-center gap-4">
      <h1 className="mb-6 mt-4 text-2xl font-bold">
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
        className="flex w-full max-w-[1200px] flex-col justify-center"
      >
        <div className="overflow-hidden rounded-[2rem] border-2 border-gray-500">
          <div className="flex min-h-16 items-center px-6 pt-2">
            <TextareaAutosize
              name="content"
              autoComplete="off"
              className="h-6 w-full resize-none border-none bg-transparent text-base outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-400"
              placeholder={
                isPending ? "Creating thread..." : "Message the AI..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              disabled={isPending}
              maxRows={10}
            />
          </div>

          <div className="flex items-center justify-between px-6 pb-3 pt-2">
            <div className="flex items-center gap-2">
              <OpenUserJourneyButton
                querySuggestions={suggestionActionWrapper}
                pendingSuggestions={pendingSuggestions}
              />
              <ToolSelectionDropdown
                availableTools={availableTools}
                checkedTools={checkedTools}
                setCheckedTools={setCheckedTools}
              />
            </div>
            <div className="flex items-center gap-3">
              <ModelSelectionDropdown
                currentModel={currentModel}
                availableModels={availableModels}
                setCurrentModel={setCurrentModel}
              />
              {isPending ? (
                <div
                  className="ml-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
                  data-testid="loading-spinner"
                />
              ) : (
                <button
                  type="submit"
                  data-testid="send-button"
                  className="ml-3 rounded-full bg-gray-100 p-3 text-gray-700 transition-all hover:bg-gray-400 hover:text-gray-800 dark:bg-gray-600/15 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <QuestionSuggestionCards
          suggestions={suggestionsState as BQuestionsSuggestions}
          onSubmit={actionWrapper}
        />
      </form>
    </div>
  ) : (
    <ChatInputLoading newMessage={newMessage} />
  );
}
