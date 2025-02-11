/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Wrench } from "lucide-react";
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

type ToolSelectionDropdownProps = {
  availableTools: string[];
  checkedTools: { [tool: string]: boolean };
  setCheckedTools: (checkedToolsObject: { [tool: string]: boolean }) => void;
};

export function ToolSelectionDropdown({
  availableTools,
  checkedTools,
  setCheckedTools,
}: ToolSelectionDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCheckboxChange = (tool: string) => {
    const newState = (prevState: { [tool: string]: boolean }) => {
      const newState = { ...prevState, [tool]: !prevState[tool] };
      const allToolsTrue = availableTools.every(
        (tool) => newState[tool] === true,
      );
      console.log(allToolsTrue);
      if (!allToolsTrue) {
        newState.allchecked = false;
      }
      return newState;
    };
    setCheckedTools(newState(checkedTools));
  };

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      // When checked is true:
      // Set every tool to true and mark allchecked as true.
      const newCheckedTools: { [tool: string]: boolean } = {};
      availableTools.forEach((tool) => {
        newCheckedTools[tool] = true;
      });
      newCheckedTools.allchecked = true;
      setCheckedTools(newCheckedTools);
    } else {
      // When checked is false:
      // First, check if all tools (from availableTools) are currently true.
      const allToolsTrue = availableTools.every(
        (tool) => checkedTools[tool] === true,
      );

      if (allToolsTrue) {
        // If all tools are checked, then uncheck all tools and set allchecked to false.
        const newCheckedTools: { [tool: string]: boolean } = {};
        availableTools.forEach((tool) => {
          newCheckedTools[tool] = false;
        });
        newCheckedTools.allchecked = false;
        setCheckedTools(newCheckedTools);
      }

      // If not all tools are checked, return the current state without modifying it.
      return checkedTools;
    }
  };

  const tools = availableTools.map((tool: string) => {
    // This will be extracted from the backend endpoint
    // Label is the frontend friendly name
    return { slug: tool, label: tool };
  });

  const filterTools = (value: string, search: string) => {
    return value.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <PopoverTrigger asChild>
        <button>
          <Wrench className="opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command filter={filterTools}>
          <CommandInput placeholder="Search tools..." />
          <CommandList>
            <CommandEmpty>No tool found.</CommandEmpty>
            <CommandGroup>
              <CommandItem key="select-all" value="" className="border-b-2">
                <Checkbox
                  checked={checkedTools.allchecked}
                  onCheckedChange={handleCheckAll}
                />
                <span className="ml-2">Select All</span>
              </CommandItem>
              {tools.map((tool) => (
                // Search is done on the value i.e. the label here
                <CommandItem key={tool.slug} value={tool.label}>
                  <Checkbox
                    checked={checkedTools[tool.slug]}
                    onCheckedChange={() => handleCheckboxChange(tool.slug)}
                  />
                  <span className="ml-2">{tool.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
