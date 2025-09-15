"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Plus } from "lucide-react";
import {
  JsonData,
  JsonEditor,
  monoDarkTheme,
  monoLightTheme,
} from "json-edit-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserHistory } from "@/lib/types";

type UserJourneyDialogProps = {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  querySuggestions: (suggestionInput: UserHistory) => void;
};

export function UserJourneyDialog({
  isDialogOpen,
  setIsDialogOpen,
  querySuggestions,
}: UserJourneyDialogProps) {
  const defaultUserFlow: UserHistory = [
    { timestamp: "2632758009", region: "Cerebellum", artifact: null },
    { timestamp: "2632798440", region: "Cerebellum", artifact: "ME-Model" },
    { timestamp: "2632840873", region: "Interbrain", artifact: "ME-Model" },
  ];

  const [userFlowData, setUserFlowData] = useState(defaultUserFlow);
  const { theme } = useTheme();
  const isLightTheme = theme === "light";

  const handleSubmit = () => {
    setIsDialogOpen(false);
    querySuggestions(userFlowData);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Edit User Flow</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <JsonEditor
            data={userFlowData}
            setData={(data: JsonData) => setUserFlowData(data as UserHistory)}
            className="max-h-[75vh] overflow-y-auto"
            theme={[
              isLightTheme ? monoLightTheme : monoDarkTheme,
              {
                styles: {
                  container: {
                    backgroundColor: isLightTheme ? "#f1f1f1" : "#151515",
                    fontFamily: "Geist Mono",
                  },
                  input: [isLightTheme ? "#575757" : "#a8a8a8"],
                  inputHighlight: isLightTheme ? "#b3d8ff" : "#1c3a59",
                },
              },
            ]}
            rootName={"JSON"}
            showStringQuotes={true}
            showArrayIndices={false}
            showCollectionCount={false}
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type UserJourneyButtonProp = {
  pendingSuggestions: boolean;
  querySuggestions: (suggestionInput: UserHistory) => void;
};

export function OpenUserJourneyButton({
  querySuggestions,
  pendingSuggestions,
}: UserJourneyButtonProp) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="mr-2"
        onClick={() => setIsDialogOpen(true)}
      >
        {pendingSuggestions ? (
          <div
            className="ml-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent p-1"
            data-testid="loading-spinner"
          />
        ) : (
          <Plus className="opacity-50" />
        )}
      </button>
      <UserJourneyDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        querySuggestions={querySuggestions}
      />
    </>
  );
}
