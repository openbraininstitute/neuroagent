"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Plus } from "lucide-react";
import { getSuggestions } from "@/actions/get-suggestions";
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
import { SuggestedQuestions } from "@/lib/types";

type UserJourneyDialogProps = {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  setSuggestions: React.Dispatch<
    React.SetStateAction<SuggestedQuestions | undefined>
  >;
};

export function UserJourneyDialog({
  isDialogOpen,
  setIsDialogOpen,
  setSuggestions,
}: UserJourneyDialogProps) {
  const defaultUserFlow = [
    [
      ["brain_region", "Brain stem"],
      ["artifact", "Neuron density"],
    ],
    [
      ["brain_region", "Cerebellum"],
      ["artifact", "Neuron density"],
    ],
    [
      ["brain_region", "Brain stem"],
      ["artifact", "Electrophysiology"],
    ],
  ];

  const [userFlowData, setUserFlowData] = useState(defaultUserFlow);
  const { theme } = useTheme();
  const isLightTheme = theme === "light";

  const handleSubmit = async () => {
    setIsDialogOpen(false);
    const questions = await getSuggestions(userFlowData);
    setSuggestions(questions as SuggestedQuestions);
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
            setData={(data: JsonData) => setUserFlowData(data as string[][][])}
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
  setSuggestions: React.Dispatch<
    React.SetStateAction<SuggestedQuestions | undefined>
  >;
};

export function OpenUserJourneyButton({
  setSuggestions,
}: UserJourneyButtonProp) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="mr-2"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus className="opacity-50" />
      </button>
      <UserJourneyDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        setSuggestions={setSuggestions}
      />
    </>
  );
}
