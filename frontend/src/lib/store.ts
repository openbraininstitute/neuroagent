import { create } from "zustand";

interface StoreState {
  newMessage: string;
  setNewMessage: (message: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  newMessage: "",
  setNewMessage: (message) => set({ newMessage: message }),
}));
