import { create } from "zustand";

interface EditorState {
  personOpen: boolean;
  personId: string | null;
  restoreOpen: boolean;
  openCreate: () => void;
  openEdit: (id: string) => void;
  closePerson: () => void;
  openRestore: () => void;
  closeRestore: () => void;
}

export const useEditor = create<EditorState>((set) => ({
  personOpen: false,
  personId: null,
  restoreOpen: false,
  openCreate: () => set({ personOpen: true, personId: null }),
  openEdit: (personId) => set({ personOpen: true, personId }),
  closePerson: () => set({ personOpen: false }),
  openRestore: () => set({ restoreOpen: true }),
  closeRestore: () => set({ restoreOpen: false }),
}));
