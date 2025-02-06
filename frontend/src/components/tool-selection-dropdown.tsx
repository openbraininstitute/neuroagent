"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench } from "lucide-react";
import { useState } from "react";

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

  return (
    <div className="absolute top-5 right-5 w-6 opacity-60">
      <DropdownMenu
        open={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger
          asChild
          className="-translate-x-[150%] -translate-y-[7%]"
        >
          <button>
            <Wrench />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="-translate-x-[40%] border-2 md:max-h-[200px] overflow-y-auto">
          <DropdownMenuItem
            className="border-b-2"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            <Checkbox
              checked={checkedTools.allchecked}
              onCheckedChange={handleCheckAll}
              defaultChecked
            />
            Select all
          </DropdownMenuItem>
          {availableTools.map((tool_name) => {
            return (
              <DropdownMenuItem
                key={tool_name}
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                <Checkbox
                  checked={checkedTools[tool_name]}
                  onCheckedChange={() => handleCheckboxChange(tool_name)}
                  defaultChecked
                />{" "}
                {tool_name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
