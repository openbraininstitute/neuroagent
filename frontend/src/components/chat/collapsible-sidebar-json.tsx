"use client";
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { X, Code, Check, Copy, Redo2 } from "lucide-react";
import {
  JsonData,
  JsonEditor,
  monoDarkTheme,
  monoLightTheme,
} from "json-edit-react";
import { useTheme } from "next-themes";
import { useFetcher } from "@/hooks/fetch";
import { BStateRead, SharedState } from "@/lib/types";
import { ToolInvocation } from "@ai-sdk/ui-utils";
import * as jsonpatch from "fast-json-patch";

type JsonSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  toolRefetchState?: ToolInvocation;
  stateKey: "smc_simulation_config"; // Add new entries here
};

export const JsonSidebar = React.memo(
  ({ isOpen, onClose, toolRefetchState, stateKey }: JsonSidebarProps) => {
    const { theme } = useTheme();
    const isLightTheme = theme === "light";

    const [isClicked, setIsClicked] = useState(false);
    const fetcher = useFetcher();
    const [state, setState] = useState<SharedState | null>(null);
    const [BState, setBState] = useState<SharedState | null>(null);
    const [diffs, setDiffs] = useState<jsonpatch.Operation[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Horizontal resizing state
    const [sidebarWidth, setSidebarWidth] = useState(500);
    const isResizingSidebar = useRef(false);
    // Vertical resizing state
    const [footerHeight, setFooterHeight] = useState(0); // default height of footer
    const isResizingFooter = useRef(false);

    // Direct API call functions - no server actions needed
    const createNewState =
      useCallback(async (): Promise<SharedState | null> => {
        try {
          const response = (await fetcher({
            method: "POST",
            path: "/state",
          })) as { state: BStateRead };
          return response.state.state;
        } catch (err) {
          console.error("Failed to create state:", err);
          return null;
        }
      }, [fetcher]);

    const getState = useCallback(async (): Promise<SharedState | null> => {
      try {
        setError(null);
        const response = (await fetcher({
          method: "GET",
          path: "/state",
        })) as BStateRead;
        return response.state;
      } catch (err) {
        console.error("Failed to fetch state:", err);
        setError("Failed to load configuration");
        try {
          // Try to create a new state if GET fails
          const newState = await createNewState();
          return newState;
        } catch (createErr) {
          console.error("Failed to create default state:", createErr);
          return null;
        }
      }
    }, [fetcher, createNewState]);

    const updateStateInBackend = useCallback(
      async (key: string, newState: unknown) => {
        try {
          const response = await fetcher({
            method: "PATCH",
            path: "/state",
            body: { key, new_state: newState },
          });
          return response;
        } catch (err) {
          console.error("Failed to update state:", err);
          throw err;
        }
      },
      [fetcher],
    );

    const resetState = useCallback(
      async (key: string) => {
        try {
          (await fetcher({
            method: "PATCH",
            path: "/state/reset",
            body: { key },
          })) as SharedState;
          const newState = await getState();
          setState(newState);
        } catch (err) {
          console.error("Failed to update state:", err);
          throw err;
        }
      },
      [fetcher],
    );

    const invertOperation = (
      operation: jsonpatch.Operation,
      originalValue?: number | string | object,
    ): jsonpatch.Operation => {
      const { op, path } = operation;

      switch (op) {
        case "add":
          // Inverse of add is remove
          return { op: "remove", path };

        case "remove":
          // Inverse of remove is add with the original value
          if (originalValue === undefined) {
            throw new Error(
              "Original value is required to invert a remove operation",
            );
          }
          return { op: "add", path, value: originalValue };

        case "replace":
          // Inverse of replace is replace with the original value
          if (originalValue === undefined) {
            throw new Error(
              "Original value is required to invert a replace operation",
            );
          }
          return { op: "replace", path, value: originalValue };

        case "move":
          // Inverse of move is move back from destination to source
          return { op: "move", from: path, path: operation.from };

        case "copy":
          // Inverse of copy is remove the copied value
          return { op: "remove", path };

        case "test":
          // Test operations don't modify the document, so they're self-inverse
          return { op: "test", path, value: operation.value };

        default:
          throw new Error(`Unknown operation: ${operation.op}`);
      }
    };

    const handleCopy = useCallback(
      (simForm: SharedState[keyof SharedState] | null) => {
        if (simForm === null || simForm === undefined) {
          console.warn("No data to copy");
          return;
        }

        const jsonString = JSON.stringify(simForm, null, 2);

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard
            .writeText(jsonString)
            .then(() => {
              setIsClicked(true);
              setTimeout(() => setIsClicked(false), 1500);
            })
            .catch((err) => {
              console.error("Failed to copy to clipboard:", err);
              // Fallback to textarea method
              fallbackCopy(jsonString);
            });
        } else {
          fallbackCopy(jsonString);
        }
      },
      [],
    );

    const fallbackCopy = (text: string) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 1500);
    };

    const handleModification = useCallback(
      async (newSubState: SharedState[keyof SharedState]) => {
        if (!state) {
          console.error("Cannot modify state: current state is null");
          return;
        }

        try {
          // Optimistically update frontend state first
          setState((prev) => ({ ...prev, [stateKey]: newSubState }));

          // Update backend with direct API call
          await updateStateInBackend(stateKey, newSubState);
        } catch (err) {
          console.error("Failed to update state:", err);
          // Revert optimistic update on error
          const currentState = await getState();
          setState(currentState);
        }
      },
      [state, stateKey, updateStateInBackend, getState],
    );

    // Memoize the resize handlers to prevent recreating them on every render
    const startSidebarResize = useCallback(() => {
      isResizingSidebar.current = true;
    }, []);
    const startFooterResize = () => {
      isResizingFooter.current = true;
    };

    const stopResizing = useCallback(() => {
      isResizingSidebar.current = false;
      isResizingFooter.current = false;
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(
          Math.min(Math.max(newWidth, 300), window.innerWidth * 0.9),
        );
      }
      if (isResizingFooter.current) {
        const newHeight = window.innerHeight - e.clientY;
        const maxHeight = window.innerHeight * 0.6;
        setFooterHeight(Math.min(Math.max(newHeight, 60), maxHeight)); // between 60px and 60% of screen
      }
    }, []);

    const handleAcceptPatch = (index: number) => {
      const testOp = index > 0 && diffs[index - 1].op === "test";
      setState(jsonpatch.applyOperation(state, diffs[index]).newDocument);
      setDiffs([...diffs.slice(testOp ? 2 : 1)]);
    };
    const handleAcceptAll = () => {
      setState(jsonpatch.applyPatch(state, diffs).newDocument);
      setDiffs([]);
    };
    const handleRejectPatch = async (index: number) => {
      debugger;
      const testOp =
        index > 0 && diffs[index - 1].op === "test"
          ? diffs[index - 1]
          : undefined;
      const inversePatch = invertOperation(
        diffs[index],
        testOp !== undefined && "value" in testOp ? testOp.value : undefined,
      );
      setDiffs([...diffs.slice(testOp === undefined ? 1 : 2)]);
      setBState(jsonpatch.applyOperation(BState, inversePatch).newDocument);
      if (BState !== null)
        await updateStateInBackend(stateKey, BState[stateKey]);
    };
    const handleRejectAll = async () => {
      if (state !== null) await updateStateInBackend(stateKey, state[stateKey]);
      setDiffs([]);
    };

    // Memoize the JsonEditor data to prevent unnecessary re-renders
    const editorData = useMemo(() => {
      return state?.[stateKey] ?? null;
    }, [state, stateKey]);

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

    // Memoize the sidebar style to prevent recalculation
    const sidebarStyle = useMemo(
      () => ({
        width: `${sidebarWidth}px`,
      }),
      [sidebarWidth],
    );
    // Fetch initial state on mount
    useEffect(() => {
      if (diffs.length === 0) {
        const fetchInitialState = async () => {
          const initialState = await getState();
          setState(initialState);
        };

        fetchInitialState();
      }
    }, [getState]);

    // State refresh on tool finish
    useEffect(() => {
      if (
        toolRefetchState &&
        state !== null &&
        toolRefetchState.state === "result"
      ) {
        try {
          const parsedToolResult = JSON.parse(toolRefetchState?.result);
          if (parsedToolResult["updated"] === true) {
            const getDiffs = async () => {
              const newState = await getState();
              const patches = jsonpatch.compare(
                state as SharedState,
                newState as SharedState,
                true,
              );
              setDiffs(patches);
              setBState(newState);

              // Use patches directly instead of diffs state
              if (patches.length > 0) {
                setFooterHeight(200);
              }
            };
            getDiffs();
          }
        } catch {}
      }
    }, [toolRefetchState?.state]);

    useEffect(() => {
      if (diffs.length === 0) {
        setFooterHeight(0);
      }
    }, [diffs.length]);

    useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResizing);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", stopResizing);
      };
    }, [handleMouseMove, stopResizing]);

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
                SMC Simulation Configuration
              </h2>
            </div>

            {/* Right side - Copy/Check button and Close button */}
            <div className="flex items-center gap-2">
              <button
                disabled={
                  toolRefetchState && toolRefetchState.state !== "result"
                }
                onClick={() => resetState(stateKey)}
                className="rounded-lg p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Reset"
              >
                <div title="Reset">
                  <Redo2 className="mr-1 h-5 w-5 text-gray-600 opacity-50 dark:text-gray-300" />
                </div>
              </button>
              {isClicked ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <div title="Copy configuration">
                  <Copy
                    className="mr-1 h-4 w-4 cursor-pointer opacity-50 transition-opacity hover:opacity-100"
                    onClick={() => handleCopy(editorData)}
                  />
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Main Content + Footer Container - Fixed height calculation */}
          <div className="flex h-[calc(100%-64px)] flex-col">
            {/* Content Area - Dynamically sized based on footer */}
            <div
              className="flex-1 overflow-hidden"
              style={{ height: `calc(100% - ${footerHeight}px - 16px)` }} // 16px for resizer
            >
              {error ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-red-500 dark:text-red-400">{error}</div>
                </div>
              ) : editorData ? (
                <JsonEditor
                  data={editorData as JsonData}
                  setData={(data: JsonData) =>
                    handleModification(data as SharedState[keyof SharedState])
                  }
                  className="h-full overflow-y-auto bg-white dark:bg-[#0A0A0A]"
                  theme={editorTheme}
                  viewOnly={
                    diffs.length > 0 || toolRefetchState?.state !== "result"
                  }
                  rootName="SMC Simulation Config"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    No configuration data available
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Resizer */}
            <div
              onMouseDown={startFooterResize}
              className="z-50 -mb-2 h-4 cursor-ns-resize"
            />

            {/* Footer - Fixed height */}
            <div
              className="flex-shrink-0 overflow-y-auto border-t border-gray-200 bg-gray-50 dark:bg-[#0A0A0A]"
              style={{ height: `${footerHeight}px` }}
            >
              <div className="p-2">
                {/* Patches List */}
                {diffs.length > 0 ? (
                  <div className="space-y-2">
                    {diffs.map((patch, index) => (
                      <>
                        {patch.op !== "test" && (
                          <div className="rounded-md border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-[#0A0A0A]">
                            {/* Patch Info */}
                            <div className="mb-1 text-xs text-gray-600 dark:text-white">
                              <span className="font-mono font-medium">
                                {patch.op.toUpperCase()}
                              </span>
                              <span className="ml-2 text-gray-500 dark:text-white">
                                {patch.path}
                              </span>
                            </div>

                            {/* Patch Value */}
                            {"value" in patch && (
                              <div className="mb-2 break-all rounded bg-gray-100 p-1 font-mono text-xs dark:bg-[#0A0A0A]">
                                {typeof patch.value === "string"
                                  ? `"${patch.value}"`
                                  : JSON.stringify(patch.value)}
                              </div>
                            )}

                            {/* Accept/Reject buttons for the first (top) patch */}
                            {index ===
                              diffs.findIndex((diff) => diff.op !== "test") && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAcceptPatch(index)}
                                  className="rounded bg-green-600 px-2 py-1 text-xs text-white transition-colors hover:bg-green-700"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectPatch(index)}
                                  className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ))}

                    {/* Accept All / Reject All buttons */}
                    <div className="sticky bottom-0 flex gap-2 border-t border-gray-300 bg-gray-50 pt-2 dark:border-gray-600 dark:bg-gray-900">
                      <button
                        onClick={handleAcceptAll}
                        className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700"
                      >
                        Accept All (
                        {diffs.filter((diff) => diff.op !== "test").length})
                      </button>
                      <button
                        onClick={handleRejectAll}
                        className="flex-1 rounded bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
                      >
                        Reject All (
                        {diffs.filter((diff) => diff.op !== "test").length})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    No diff to review
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

JsonSidebar.displayName = "JsonSidebar";
