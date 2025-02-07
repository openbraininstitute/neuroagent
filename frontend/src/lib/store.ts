import { create } from "zustand";

interface StoreState {
  newMessage: string;
  setNewMessage: (message: string) => void;
  checkedTools: { [tool: string]: boolean };
  setCheckedTools: (checkedToolsObject: { [tool: string]: boolean }) => void;
}

export const useStore = create<StoreState>((set) => ({
  newMessage: "",
  setNewMessage: (message) => set({ newMessage: message }),
  checkedTools: {},
  setCheckedTools: (checkedToolsObject) =>
    set({ checkedTools: checkedToolsObject }),
}));
