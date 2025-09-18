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
  stateKey: "smc_simulation_config";
};

// Memoized diff item component to prevent re-renders
const DiffItem = React.memo(
  ({
    patch,
    index,
    isFirst,
    onAccept,
    onReject,
  }: {
    patch: jsonpatch.Operation;
    index: number;
    isFirst: boolean;
    onAccept: (index: number) => void;
    onReject: (index: number) => void;
  }) => {
    if (patch.op === "test") return null;

    return (
      <div className="rounded-md border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-[#0A0A0A]">
        <div className="mb-1 text-xs text-gray-600 dark:text-white">
          <span className="font-mono font-medium">
            {patch.op.toUpperCase()}
          </span>
          <span className="ml-2 text-gray-500 dark:text-white">
            {patch.path}
          </span>
        </div>

        {"value" in patch && (
          <div className="mb-2 break-all rounded bg-gray-100 p-1 font-mono text-xs dark:bg-[#0A0A0A]">
            {typeof patch.value === "string"
              ? `"${patch.value}"`
              : JSON.stringify(patch.value)}
          </div>
        )}

        {isFirst && (
          <div className="flex gap-1">
            <button
              onClick={() => onAccept(index)}
              className="rounded bg-green-600 px-2 py-1 text-xs text-white transition-colors hover:bg-green-700"
            >
              Accept
            </button>
            <button
              onClick={() => onReject(index)}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  },
);

DiffItem.displayName = "DiffItem";

// Memoized diff list component
const DiffList = React.memo(
  ({
    diffs,
    onAcceptPatch,
    onRejectPatch,
    onAcceptAll,
    onRejectAll,
  }: {
    diffs: jsonpatch.Operation[];
    onAcceptPatch: (index: number) => void;
    onRejectPatch: (index: number) => void;
    onAcceptAll: () => void;
    onRejectAll: () => void;
  }) => {
    const nonTestDiffs = useMemo(
      () => diffs.filter((diff) => diff.op !== "test"),
      [diffs],
    );

    const firstNonTestIndex = useMemo(
      () => diffs.findIndex((diff) => diff.op !== "test"),
      [diffs],
    );

    if (diffs.length === 0) {
      return (
        <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
          No diff to review
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {diffs.map((patch, index) => (
          <DiffItem
            key={`${patch.op}-${patch.path}-${index}`}
            patch={patch}
            index={index}
            isFirst={index === firstNonTestIndex}
            onAccept={onAcceptPatch}
            onReject={onRejectPatch}
          />
        ))}

        <div className="sticky bottom-0 flex gap-2 border-t border-gray-300 bg-gray-50 pt-2 dark:border-gray-600 dark:bg-gray-900">
          <button
            onClick={onAcceptAll}
            className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700"
          >
            Accept All ({nonTestDiffs.length})
          </button>
          <button
            onClick={onRejectAll}
            className="flex-1 rounded bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
          >
            Reject All ({nonTestDiffs.length})
          </button>
        </div>
      </div>
    );
  },
);

DiffList.displayName = "DiffList";

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

    // Resize state with refs to avoid re-renders
    const [sidebarWidth, setSidebarWidth] = useState(500);
    const [footerHeight, setFooterHeight] = useState(0);
    const isResizingSidebar = useRef(false);
    const isResizingFooter = useRef(false);

    // Memoize API functions with proper dependencies
    const apiMethods = useMemo(
      () => ({
        createNewState: async (): Promise<SharedState | null> => {
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
        },

        getState: async (): Promise<SharedState | null> => {
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
              const response = (await fetcher({
                method: "POST",
                path: "/state",
              })) as { state: BStateRead };
              return response.state.state;
            } catch (createErr) {
              console.error("Failed to create default state:", createErr);
              return null;
            }
          }
        },

        updateStateInBackend: async (key: string, newState: unknown) => {
          try {
            return await fetcher({
              method: "PATCH",
              path: "/state",
              body: { key, new_state: newState },
            });
          } catch (err) {
            console.error("Failed to update state:", err);
            throw err;
          }
        },

        resetState: async (key: string) => {
          try {
            await fetcher({
              method: "PATCH",
              path: "/state/reset",
              body: { key },
            });
            const response = (await fetcher({
              method: "GET",
              path: "/state",
            })) as BStateRead;
            setState(response.state);
          } catch (err) {
            console.error("Failed to reset state:", err);
            throw err;
          }
        },
      }),
      [fetcher],
    );

    // Memoize utility functions
    const utils = useMemo(
      () => ({
        invertOperation: (
          operation: jsonpatch.Operation,
          originalValue?: number | string | object,
        ): jsonpatch.Operation => {
          const { op, path } = operation;

          switch (op) {
            case "add":
              return { op: "remove", path };
            case "remove":
              if (originalValue === undefined) {
                throw new Error(
                  "Original value is required to invert a remove operation",
                );
              }
              return { op: "add", path, value: originalValue };
            case "replace":
              if (originalValue === undefined) {
                throw new Error(
                  "Original value is required to invert a replace operation",
                );
              }
              return { op: "replace", path, value: originalValue };
            case "move":
              return { op: "move", from: path, path: operation.from };
            case "copy":
              return { op: "remove", path };
            case "test":
              return { op: "test", path, value: operation.value };
            default:
              throw new Error(`Unknown operation: ${operation.op}`);
          }
        },

        fallbackCopy: (text: string) => {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        },
      }),
      [],
    );

    // Stable event handlers
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
              utils.fallbackCopy(jsonString);
              setIsClicked(true);
              setTimeout(() => setIsClicked(false), 1500);
            });
        } else {
          utils.fallbackCopy(jsonString);
          setIsClicked(true);
          setTimeout(() => setIsClicked(false), 1500);
        }
      },
      [utils],
    );

    const handleModification = useCallback(
      async (newSubState: SharedState[keyof SharedState]) => {
        if (!state) {
          console.error("Cannot modify state: current state is null");
          return;
        }

        try {
          setState((prev) => ({ ...prev, [stateKey]: newSubState }));
          await apiMethods.updateStateInBackend(stateKey, newSubState);
        } catch (err) {
          console.error("Failed to update state:", err);
          const currentState = await apiMethods.getState();
          setState(currentState);
        }
      },
      [state, stateKey, apiMethods],
    );

    // Optimized resize handlers
    const resizeHandlers = useMemo(
      () => ({
        startSidebarResize: () => {
          isResizingSidebar.current = true;
        },
        startFooterResize: () => {
          isResizingFooter.current = true;
        },
        stopResizing: () => {
          isResizingSidebar.current = false;
          isResizingFooter.current = false;
        },
      }),
      [],
    );

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
        setFooterHeight(Math.min(Math.max(newHeight, 60), maxHeight));
      }
    }, []);

    // Stable diff handlers
    const diffHandlers = useMemo(
      () => ({
        handleAcceptPatch: (index: number) => {
          const testOp = index > 0 && diffs[index - 1].op === "test";
          setState(jsonpatch.applyOperation(state, diffs[index]).newDocument);
          setDiffs(diffs.slice(testOp ? 2 : 1));
        },

        handleAcceptAll: () => {
          setState(jsonpatch.applyPatch(state, diffs).newDocument);
          setDiffs([]);
        },

        handleRejectPatch: async (index: number) => {
          const testOp =
            index > 0 && diffs[index - 1].op === "test"
              ? diffs[index - 1]
              : undefined;
          const inversePatch = utils.invertOperation(
            diffs[index],
            testOp !== undefined && "value" in testOp
              ? testOp.value
              : undefined,
          );
          setDiffs(diffs.slice(testOp === undefined ? 1 : 2));
          setBState(jsonpatch.applyOperation(BState, inversePatch).newDocument);
          if (BState !== null) {
            await apiMethods.updateStateInBackend(stateKey, BState[stateKey]);
          }
        },

        handleRejectAll: async () => {
          if (state !== null) {
            await apiMethods.updateStateInBackend(stateKey, state[stateKey]);
          }
          setDiffs([]);
        },
      }),
      [diffs, state, BState, stateKey, utils, apiMethods],
    );

    // Memoized computed values
    const computedValues = useMemo(
      () => ({
        editorData: state?.[stateKey] ?? null,
        sidebarStyle: { width: `${sidebarWidth}px` },
        editorTheme: [
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
        isViewOnly: diffs.length > 0 || toolRefetchState?.state !== "result",
      }),
      [
        state,
        stateKey,
        sidebarWidth,
        isLightTheme,
        diffs.length,
        toolRefetchState?.state,
      ],
    );

    // Effects
    useEffect(() => {
      if (diffs.length === 0) {
        apiMethods.getState().then(setState);
      }
    }, [apiMethods]);

    useEffect(() => {
      if (
        toolRefetchState &&
        state !== null &&
        toolRefetchState.state === "result"
      ) {
        try {
          const parsedToolResult = JSON.parse(toolRefetchState?.result);
          if (parsedToolResult["updated"] === true) {
            apiMethods.getState().then((newState) => {
              const patches = jsonpatch.compare(
                state as SharedState,
                newState as SharedState,
                true,
              );
              setDiffs(patches);
              setBState(newState);

              if (patches.length > 0) {
                setFooterHeight(200);
              }
            });
          }
        } catch {}
      }
    }, [toolRefetchState?.state, apiMethods]);

    useEffect(() => {
      if (diffs.length === 0) {
        setFooterHeight(0);
      }
    }, [diffs.length]);

    useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", resizeHandlers.stopResizing);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", resizeHandlers.stopResizing);
      };
    }, [handleMouseMove, resizeHandlers.stopResizing]);

    // Early return for performance
    if (!isOpen) {
      return null;
    }

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={onClose}
        />

        <div
          style={computedValues.sidebarStyle}
          className={`fixed right-0 top-0 z-50 h-full max-w-[90vw] translate-x-0 transform border-l border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-[#0A0A0A]`}
        >
          <div
            onMouseDown={resizeHandlers.startSidebarResize}
            className="absolute z-50 -ml-2 h-full w-4 cursor-ew-resize"
          />

          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4 dark:bg-[#0A0A0A]">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                SMC Simulation Configuration
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={
                  toolRefetchState && toolRefetchState.state !== "result"
                }
                onClick={() => apiMethods.resetState(stateKey)}
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
                    onClick={() => handleCopy(computedValues.editorData)}
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

          <div className="flex h-[calc(100%-64px)] flex-col">
            <div
              className="flex-1 overflow-hidden"
              style={{ height: `calc(100% - ${footerHeight}px - 16px)` }}
            >
              {error ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-red-500 dark:text-red-400">{error}</div>
                </div>
              ) : computedValues.editorData ? (
                <JsonEditor
                  data={computedValues.editorData as JsonData}
                  setData={(data: JsonData) =>
                    handleModification(data as SharedState[keyof SharedState])
                  }
                  className="h-full overflow-y-auto bg-white dark:bg-[#0A0A0A]"
                  theme={computedValues.editorTheme}
                  viewOnly={computedValues.isViewOnly}
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

            <div
              onMouseDown={resizeHandlers.startFooterResize}
              className="z-50 -mb-2 h-4 cursor-ns-resize"
            />

            <div
              className="flex-shrink-0 overflow-y-auto border-t border-gray-200 bg-gray-50 dark:bg-[#0A0A0A]"
              style={{ height: `${footerHeight}px` }}
            >
              <div className="p-2">
                <DiffList
                  diffs={diffs}
                  onAcceptPatch={diffHandlers.handleAcceptPatch}
                  onRejectPatch={diffHandlers.handleRejectPatch}
                  onAcceptAll={diffHandlers.handleAcceptAll}
                  onRejectAll={diffHandlers.handleRejectAll}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

JsonSidebar.displayName = "JsonSidebar";
