// src/stores/useSectionStore.ts
import { create } from 'zustand'

export type SectionName = 'profile' | 'tech' | 'experience'
type Section = SectionName | null

type State = {
  section: Section
  // 既存互換
  setSection: (v: Section) => void
  // 新API
  open:   (s: SectionName) => void
  close:  () => void
  toggle: (s: SectionName) => void
}

export const useSectionStore = create<State>((set, get) => ({
  section: null,
  // 既存互換: これがあるので従来コードはそのままでOK
  setSection: (v) => set({ section: v }),

  // 新API
  open:   (s) => set({ section: s }),
  close:  () => set({ section: null }),
  toggle: (s) => set({ section: get().section === s ? null : s }),
}))
