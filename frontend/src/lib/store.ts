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
    id: "openai/gpt-5-mini",
    name: "OpenAI: GPT-5-mini",
    metadata: "0.25$/M tokens, 400k context length, 7/8/2025",
  },
  setCurrentModel: (model) => set({ currentModel: model }),
}));
