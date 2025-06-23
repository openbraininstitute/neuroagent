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
    id: "openai/gpt-4.1-mini",
    name: "OpenAI: GPT-4.1-mini",
    metadata: "(0.4$/M tokens, 1048k context length, 14/04/2025)",
  },
  setCurrentModel: (model) => set({ currentModel: model }),
}));
