import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BranchOption = {
  id: string;
  short_name: string;
  long_name: string;
};

type BranchStore = {
  branches: BranchOption[];
  selectedBranchId: string | null;
  setBranches: (branches: BranchOption[]) => void;
  setSelectedBranchId: (id: string | null) => void;
};

export const useBranchStore = create<BranchStore>()(
  persist(
    (set) => ({
      branches: [],
      selectedBranchId: null,
      setBranches: (branches) => set({ branches }),
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),
    }),
    {
      name: "optical-dashboard-branch",
      partialize: (state) => ({ selectedBranchId: state.selectedBranchId }),
    },
  ),
);
