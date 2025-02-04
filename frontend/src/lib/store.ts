import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StoreState {
  newMessage: string;
  setNewMessage: (message: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      newMessage: "",
      setNewMessage: (message) => set({ newMessage: message }),
    }),
    {
      name: "store", // unique name for the storage
    },
  ),
);
