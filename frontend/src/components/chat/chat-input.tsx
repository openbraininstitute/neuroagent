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
import { LLMModel, UserHistory, BQuestionsSuggestions } from "@/lib/types";
import { getSuggestionsNoMessage } from "@/actions/get-suggestions";
import { ModelSelectionDropdown } from "./model-selection";
import { SuggestionCycler } from "./suggestion-cycler";
import { SuggestionDots } from "./suggestion-dots";

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
  const [suggestion, setSuggestion] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fullSuggestion, setFullSuggestion] = useState("");
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

  const handleSuggestionChange = (text: string) => setSuggestion(text);
  const handleFullSuggestionChange = (text: string) => setFullSuggestion(text);
  const handleIndexChange = (index: number) => setCurrentSuggestionIndex(index);

  const [, action, isPending] = useActionState(createThread, null);
  const [suggestionsState, querySuggestions, pendingSuggestions] =
    useActionState(getSuggestionsNoMessage, null);

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

  const suggestionActionWrapper = (suggestionInput: UserHistory) => {
    startTransition(() => querySuggestions(suggestionInput));
  };

  useEffect(() => {
    if (Object.keys(checkedTools).length === 0) {
      setCheckedTools(convert_tools_to_set(availableTools));
    }
    startTransition(() => querySuggestions([]));
  }, []);

  useEffect(() => {
    const state = suggestionsState as BQuestionsSuggestions | null;
    if (state?.suggestions && state.suggestions.length > 0) {
      const suggestionList = state.suggestions.map((s) => s.question);
      setSuggestions(suggestionList);
      setFullSuggestion(suggestionList[0]);
    }
  }, [suggestionsState]);

  return !isPending ? (
    <div className="m-5 flex h-[100%] flex-col items-center justify-center gap-4">
      <h1 className="mb-6 mt-4 text-2xl font-bold">
        What can I help you with?
      </h1>
      {suggestions.length > 0 && (
        <SuggestionCycler
          suggestions={suggestions}
          onSuggestionChange={handleSuggestionChange}
          onFullSuggestionChange={handleFullSuggestionChange}
          isPaused={input.length > 0}
          onIndexChange={handleIndexChange}
          selectedIndex={currentSuggestionIndex}
        />
      )}
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
          <div className="relative flex min-h-16 items-center px-6 pt-2">
            <TextareaAutosize
              name="content"
              autoComplete="off"
              className="relative z-10 h-6 w-full resize-none border-none bg-transparent text-base outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-400"
              placeholder={
                isPending
                  ? "Creating thread..."
                  : !input && suggestions.length > 0
                    ? suggestion
                    : "Message the AI..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !input && fullSuggestion) {
                  e.preventDefault();
                  setInput(fullSuggestion);
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={isPending}
              maxRows={10}
            />
          </div>

          <div className="flex items-center justify-between px-6 pb-3 pt-2">
            <div className="flex items-center gap-5">
              <ToolSelectionDropdown
                availableTools={availableTools}
                checkedTools={checkedTools}
                setCheckedTools={setCheckedTools}
              />
              <OpenUserJourneyButton
                querySuggestions={suggestionActionWrapper}
                pendingSuggestions={pendingSuggestions}
              />
              <SuggestionDots
                count={suggestions.length}
                activeIndex={currentSuggestionIndex}
                onDotClick={(index) => {
                  setCurrentSuggestionIndex(index);
                  setInput(suggestions[index]);
                }}
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
                  className="ml-3 rounded-full bg-gray-100 p-3 text-gray-700 transition-all hover:bg-gray-400 hover:text-gray-800 disabled:opacity-50 dark:bg-gray-600/15 dark:text-gray-300 dark:hover:bg-gray-800"
                  disabled={!input}
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  ) : (
    <ChatInputLoading newMessage={newMessage} />
  );
}
