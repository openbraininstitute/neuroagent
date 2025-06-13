import { create } from "zustand";
import { LLMModel } from "./types";

interface StoreState {
  newMessage: string;
  setNewMessage: (message: string) => void;
  checkedTools: { [tool: string]: boolean };
  setCheckedTools: (checkedToolsObject: { [tool: string]: boolean }) => void;
  currentModel: LLMModel;
  setCurrentModel: (model: LLMModel) => void;
}

export const useStore = create<StoreState>((set) => ({
  newMessage: "",
  setNewMessage: (message) => set({ newMessage: message }),
  checkedTools: {},
  setCheckedTools: (checkedToolsObject) =>
    set({ checkedTools: checkedToolsObject }),
  currentModel: {
    id: "gpt-4o-mini",
    name: "OpenAI: GPT-4o-mini",
    metadata: "(0.15$/M tokens, 128k context, 16/07/2024)",
  },
  setCurrentModel: (model) => set({ currentModel: model }),
}));
