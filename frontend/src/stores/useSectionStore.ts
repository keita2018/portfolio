// src/stores/useSectionStore.ts
import { create } from 'zustand'

type Section = 'none' | 'profile' | 'tech' | 'experience'

interface SectionStore {
  section: Section
  setSection: (s: Section) => void
}

export const useSectionStore = create<SectionStore>((set) => ({
  section: 'none',
  setSection: (s) => set({ section: s }),
}))
