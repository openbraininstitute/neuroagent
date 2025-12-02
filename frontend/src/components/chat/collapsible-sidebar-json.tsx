"use client";
import React, {
  useRef,
  useState,
  useEffect,
  SetStateAction,
  Dispatch,
  useCallback,
  useMemo,
} from "react";
import { X, Code, Check, Copy } from "lucide-react";
import {
  JsonData,
  JsonEditor,
  monoDarkTheme,
  monoLightTheme,
} from "json-edit-react";
import { useTheme } from "next-themes";
import { SimulationsForm } from "@/lib/types";

export type PatchOperation = {
  op: "add" | "replace" | "remove";
  path: string;
  value: string;
};

type JsonSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  simConfigJson: Record<string, SimulationsForm>;
  setSimConfigJson: Dispatch<SetStateAction<Record<string, SimulationsForm>>>;
};

export const JsonSidebar = React.memo(
  ({ isOpen, onClose, simConfigJson, setSimConfigJson }: JsonSidebarProps) => {
    const { theme } = useTheme();
    const isLightTheme = theme === "light";

    // Horizontal resizing state
    const [sidebarWidth, setSidebarWidth] = useState(500);
    const isResizingSidebar = useRef(false);
    const [isClicked, setIsClicked] = useState(false);

    const handleCopy = (SimForm: SimulationsForm) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(JSON.stringify(SimForm));
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 1500);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = JSON.stringify(SimForm);
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        setIsClicked(true);
        document.body.removeChild(textarea);
        setTimeout(() => setIsClicked(false), 1500);
      }
    };

    // Memoize the resize handlers to prevent recreating them on every render
    const startSidebarResize = useCallback(() => {
      isResizingSidebar.current = true;
    }, []);

    const stopResizing = useCallback(() => {
      isResizingSidebar.current = false;
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(
          Math.min(Math.max(newWidth, 300), window.innerWidth * 0.9),
        );
      }
    }, []);

    // Debounce the JSON editor data changes to reduce frequent updates
    const debouncedSetData = useCallback(
      (data: JsonData) => {
        // Use a timeout to debounce rapid changes
        const timeoutId = setTimeout(() => {
          setSimConfigJson((prev) => ({
            ...prev,
            smc_simulation_config: data as SimulationsForm,
          }));
        }, 100); // 100ms debounce

        return () => clearTimeout(timeoutId);
      },
      [setSimConfigJson],
    );

    // Memoize the JsonEditor data to prevent unnecessary re-renders
    const editorData = useMemo(() => {
      return simConfigJson.smc_simulation_config;
    }, [simConfigJson.smc_simulation_config]);

    // Memoize the theme configuration to prevent recreation on every render
    const editorTheme = useMemo(
      () => [
        isLightTheme ? monoLightTheme : monoDarkTheme,
        {
          styles: {
            container: {
              backgroundColor: isLightTheme ? "#f1f1f1" : "#0A0A0A",
              fontFamily: "Geist Mono",
            },
            input: [isLightTheme ? "#575757" : "#a8a8a8"],
            inputHighlight: isLightTheme ? "#b3d8ff" : "#1c3a59",
          },
        },
      ],
      [isLightTheme],
    );

    useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResizing);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", stopResizing);
      };
    }, [handleMouseMove, stopResizing]);

    // Memoize the sidebar style to prevent recalculation
    const sidebarStyle = useMemo(
      () => ({
        width: `${sidebarWidth}px`,
      }),
      [sidebarWidth],
    );

    // Only render the sidebar content when it's open to improve performance
    if (!isOpen) {
      return null;
    }

    return (
      <>
        {/* Overlay for mobile/smaller screens */}
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={onClose}
        />

        {/* Sidebar */}
        <div
          style={sidebarStyle}
          className={`fixed right-0 top-0 z-50 h-full max-w-[90vw] translate-x-0 transform border-l border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-[#0A0A0A]`}
        >
          {/* Left edge resizer (for right-aligned sidebar) */}
          <div
            onMouseDown={startSidebarResize}
            className="absolute z-50 -ml-2 h-full w-4 cursor-ew-resize"
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4 dark:bg-[#0A0A0A]">
            {/* Left side - Title */}
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Small Micro Circuit Simulation Configuration
              </h2>
            </div>

            {/* Right side - Copy/Check button and Close button */}
            <div className="flex items-center gap-2">
              {isClicked ? (
                <Check className="h-4 w-4" />
              ) : (
                <div title="Copy configuration">
                  <Copy
                    className="h-4 w-4 cursor-pointer opacity-50"
                    onClick={() =>
                      handleCopy(simConfigJson.smc_simulation_config)
                    }
                  />
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1 transition-colors hover:bg-gray-200"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Main Content + Footer (Resizable) */}
          <div className="flex h-[calc(100%-64px)] flex-col">
            {/* Content Area */}
            <JsonEditor
              data={editorData}
              setData={debouncedSetData}
              className="max-h-full overflow-y-auto bg-white dark:bg-[#0A0A0A]"
              theme={editorTheme}
              rootName="SMC Simulation Config"
            />
          </div>
        </div>
      </>
    );
  },
);

JsonSidebar.displayName = "JsonSidebar";
