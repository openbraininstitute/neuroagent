"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, Info } from "lucide-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";

type ToolSelectionDropdownProps = {
  availableTools: Array<{ slug: string; label: string }>;
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
        (tool) => newState[tool.slug] === true,
      );
      if (!allToolsTrue) {
        newState.allchecked = false;
      }
      return newState;
    };
    setCheckedTools(newState(checkedTools));
  };

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      const newCheckedTools: { [tool: string]: boolean } = {};
      availableTools.forEach((tool) => {
        newCheckedTools[tool.slug] = true;
      });
      newCheckedTools.allchecked = true;
      setCheckedTools(newCheckedTools);
    } else {
      const allToolsTrue = availableTools.every(
        (tool) => checkedTools[tool.slug] === true,
      );

      if (allToolsTrue) {
        const newCheckedTools: { [tool: string]: boolean } = {};
        availableTools.forEach((tool) => {
          newCheckedTools[tool.slug] = false;
        });
        newCheckedTools.allchecked = false;
        setCheckedTools(newCheckedTools);
      }
    }
  };

  const filterTools = (value: string, search: string) => {
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
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
          <div className="max-h-[300px] overflow-y-auto">
            <CommandList>
              <CommandEmpty>No tool found.</CommandEmpty>
              <CommandGroup>
                <CommandItem key="select-all" className="border-b-2" asChild>
                  <label
                    htmlFor="select-all-checkbox"
                    className="cursor-pointer flex items-center w-full"
                    onClick={(e) => {
                      // Prevent any native label behavior.
                      e.preventDefault();
                      // Call your handler with the current state.
                      handleCheckAll(!checkedTools.allchecked);
                    }}
                  >
                    <Checkbox
                      id="select-all-checkbox"
                      checked={checkedTools.allchecked}
                    />
                    <span className="ml-2">Select All</span>
                  </label>
                </CommandItem>
                {availableTools.map((tool) => (
                  <CommandItem key={tool.slug} value={tool.label} asChild>
                    <label
                      htmlFor={tool.slug}
                      className="cursor-pointer flex items-center w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCheckboxChange(tool.slug);
                      }}
                    >
                      <Checkbox
                        id={tool.slug}
                        checked={checkedTools[tool.slug]}
                      />
                      <span className="ml-2">{tool.label}</span>
                    </label>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
          <CommandSeparator />
          <CommandGroup>
            <Link href="/tools">
              <CommandItem>
                <Info />
                <span>Learn About Tools</span>
              </CommandItem>
            </Link>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
