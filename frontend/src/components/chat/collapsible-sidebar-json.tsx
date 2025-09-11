import React, { useRef, useState, useEffect } from "react";
import { X, Code } from "lucide-react";
import {
  JsonData,
  JsonEditor,
  monoDarkTheme,
  monoLightTheme,
} from "json-edit-react";
import { useTheme } from "next-themes";
import { useStore } from "@/lib/store";
import * as jsonpatch from 'fast-json-patch';

export type PatchOperation = {
  op: "add" | "replace" | "remove";  // expand this if needed
  path: string;
  value: string;
};

type JsonSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  patches?: PatchOperation[]
};

export function JsonSidebar({ isOpen, onClose, patches }: JsonSidebarProps) {
  const { theme } = useTheme();
  const isLightTheme = theme === "light";
  const simConfigJson = useStore((state) => state.simConfigJson);
  const setSimConfigJson = useStore((state) => state.setSimConfigJson);
  const [diff, setDiff] = useState<PatchOperation[] | undefined>(patches)
  console.log(patches)
  console.log(diff)
  // Horizontal resizing state
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const isResizingSidebar = useRef(false);

  // Vertical resizing state
  const [footerHeight, setFooterHeight] = useState(200); // default height of footer
  const isResizingFooter = useRef(false);

  const startSidebarResize = () => {
    isResizingSidebar.current = true;
  };

  const startFooterResize = () => {
    isResizingFooter.current = true;
  };

  const stopResizing = () => {
    isResizingSidebar.current = false;
    isResizingFooter.current = false;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSidebar.current) {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(Math.max(newWidth, 300), window.innerWidth * 0.9));
    }

    if (isResizingFooter.current) {
      const newHeight = window.innerHeight - e.clientY;
      const maxHeight = window.innerHeight * 0.6;
      setFooterHeight(Math.min(Math.max(newHeight, 60), maxHeight)); // between 60px and 60% of screen
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  const handleAcceptPatch = (index: number) => {
    if (diff !== undefined){
        setSimConfigJson(jsonpatch.applyOperation(simConfigJson, diff[index]).newDocument);
        setDiff(diff.filter((_, i) => i !== index))
    }
}
  const handleAcceptAll = () => {
    if (diff !== undefined){
        setSimConfigJson(jsonpatch.applyPatch(simConfigJson, diff).newDocument);
        setDiff([])
    }
}
  const handleRejectPatch = (index: number) => diff !== undefined && setDiff(diff.filter((_, i) => i !== index));
  const handleRejectAll = () => diff !== undefined && setDiff([]);

  useEffect(() => {
    // debugger;
    diff === undefined || diff.length === 0 ? setFooterHeight(0) : setFooterHeight(200)
  }, [diff])

  return (
    <>
      {/* Overlay for mobile/smaller screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className={`fixed right-0 top-0 z-50 h-full max-w-[90vw] border-l border-gray-200 bg-white shadow-lg dark:bg-[#0A0A0A] transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Left edge resizer (for right-aligned sidebar) */}
        <div
        onMouseDown={startSidebarResize}
       className="absolute h-full -ml-2 z-50 cursor-ew-resize w-4"
        >
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4 dark:bg-[#0A0A0A]">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Small Micro Circuit Simulation Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-gray-200"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Main Content + Footer (Resizable) */}
        <div className="flex h-[calc(100%-64px)] flex-col"> {/* 64px = header height */}
          {/* Content Area */}
          <div
            className="flex-1 overflow-auto"
            style={{ height: `calc(100% - ${footerHeight}px)` }}
          >
            <JsonEditor
              data={simConfigJson.smc_simulation_config}
              setData={(data: JsonData) => {
                setSimConfigJson(data as Record<string, any>);
              }}
              className="max-h-full overflow-y-auto bg-white dark:bg-[#0A0A0A]"
              theme={[
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
              ]}
              rootName={"SMC Simulation Config"}
            />
          </div>

          {/* Horizontal Resizer */}
          <div
            onMouseDown={startFooterResize}
            className="h-4 cursor-ns-resize z-50 -mb-2"
          />


<div
  className="border-t border-gray-200 bg-gray-50 dark:bg-[#0A0A0A] overflow-y-auto"
  style={{ height: `${footerHeight}px` }}
>
  <div className="p-2">
    {/* Patches List */}
    {diff !== undefined && diff.length > 0 ? (
      <div className="space-y-2">
        {diff.map((patch, index) => (
          <div
            key={index}
            className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-[#0A0A0A]"
          >
            {/* Patch Info */}
            <div className="text-xs text-gray-600 dark:text-white mb-1">
              <span className="font-mono font-medium">{patch.op.toUpperCase()}</span>
              <span className="ml-2 text-gray-500 dark:text-white">{patch.path}</span>
            </div>
            
            {/* Patch Value */}
            {patch.value !== undefined && (
              <div className="text-xs font-mono bg-gray-100 dark:bg-[#0A0A0A] rounded p-1 mb-2 break-all">
                {typeof patch.value === 'string' ? `"${patch.value}"` : JSON.stringify(patch.value)}
              </div>
            )}
            
            {/* Accept/Reject buttons for the first (top) patch */}
            {index === 0 && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleAcceptPatch(index)}
                  className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectPatch(index)}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        
        {/* Accept All / Reject All buttons */}
        <div
  className="sticky bottom-0 flex gap-2 pt-2 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
>
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
          >
            Accept All ({diff.length})
          </button>
          <button
            onClick={handleRejectAll}
            className="flex-1 px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
          >
            Reject All ({diff.length})
          </button>
        </div>
      </div>
    ) : (
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
        No diff to review
      </div>
    )}
  </div>
</div>
        </div>
      </div>
    </>
  );
}
