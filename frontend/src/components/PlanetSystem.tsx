// src/components/PlanetSystem.tsx
import Planet from './Planet'
import Sun from './Sun'
import { useSectionStore } from '../stores/useSectionStore'

export default function PlanetSystem() {
  const setSection = useSectionStore((s) => s.setSection)

  return (
    <>
      {/* 太陽 */}
      <Sun />

      {/* 惑星たち */}
      <Planet color="green" orbitRadius={4} orbitSpeed={0.01} size={0.5} onClick={() => setSection('profile')}/>
      <Planet color="blue" orbitRadius={6} orbitSpeed={0.008} size={0.7} onClick={() => setSection('tech')}/>
      <Planet color="white" orbitRadius={8} orbitSpeed={0.006} size={0.4} onClick={() => setSection('experience')}/>
    </>
  )
}
