import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  projectID: string;
  virtualLabID: string;
  token: string;
  setProjectID: (id: string) => void;
  setVirtualLabID: (id: string) => void;
  setToken: (token: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      projectID: "",
      virtualLabID: "",
      token: "",

      setProjectID: (id: string) => set({ projectID: id }),
      setVirtualLabID: (id: string) => set({ virtualLabID: id }),
      setToken: (token: string) => set({ token }),
    }),
    {
      name: "app-storage", // unique name for localStorage key
    },
  ),
);
