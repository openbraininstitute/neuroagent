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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={isOpen}
          className="inline-flex min-w-[200px] items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-600/15 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-blue-400"
        >
          <span className="truncate">{currentModel.name}</span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto min-w-[200px] p-0"
        side="top"
        align="end"
      >
        <Command filter={filterModels}>
          <CommandInput placeholder="Search models..." className="h-9" />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup heading="Available Models">
              {availableModels.map((model) => (
                <CommandItem
                  key={`${model.name} (${model.metadata})`}
                  onSelect={() => {
                    setCurrentModel(model);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{`${model.name} (${model.metadata})`}</span>
                  {model.name === currentModel.name && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
