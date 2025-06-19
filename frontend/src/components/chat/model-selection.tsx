"use client";

import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LLMModel } from "@/lib/types";

type ModelSelectionDropdownProps = {
  availableModels: Array<LLMModel>;
  currentModel: LLMModel;
  setCurrentModel: (model: LLMModel) => void;
};

export function ModelSelectionDropdown({
  availableModels,
  currentModel,
  setCurrentModel,
}: ModelSelectionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filterModels = (value: string, search: string) => {
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  };

  // Extract model name without provider
  const getModelNameOnly = (fullName: string) => {
    // Handle "Anthropic: Claude 3 Opus" format
    const colonSplit = fullName.split(": ");
    if (colonSplit.length > 1) {
      return colonSplit.slice(1).join(": ");
    }

    // Handle "Provider : Model" format
    const spacedColonSplit = fullName.split(" : ");
    if (spacedColonSplit.length > 1) {
      return spacedColonSplit.slice(1).join(" : ");
    }

    // Return as-is if no provider prefix found
    return fullName;
  };

  const renderModelItem = (
    model: LLMModel,
    isCurrentModel: boolean,
    showInTopPosition = false,
  ) => (
    <CommandItem
      key={
        showInTopPosition
          ? `selected-${model.name}`
          : `${model.name} (${model.metadata})`
      }
      onSelect={() => {
        setCurrentModel(model);
        setIsOpen(false);
      }}
      className={`flex items-center justify-between ${
        isCurrentModel
          ? "border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : ""
      }`}
    >
      <div className="flex flex-col">
        <span
          className={`font-medium ${
            isCurrentModel ? "text-blue-700 dark:text-blue-300" : ""
          }`}
        >
          {model.name}
        </span>
        <span
          className={`text-xs ${
            isCurrentModel
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {model.metadata}
        </span>
      </div>
      {isCurrentModel && (
        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      )}
    </CommandItem>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={isOpen}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:bg-gray-600/15 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <span className="max-w-[120px] truncate">
            {getModelNameOnly(currentModel.name)}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto min-w-[280px] p-0"
        side="top"
        align="start"
      >
        <Command filter={filterModels}>
          <CommandInput placeholder="Search models..." className="h-9" />

          <CommandGroup>{renderModelItem(currentModel, true)}</CommandGroup>

          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No models found.</CommandEmpty>

            <CommandGroup>
              {availableModels.map((model) => {
                const isCurrentModel = model.name === currentModel.name;
                return renderModelItem(model, isCurrentModel);
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
