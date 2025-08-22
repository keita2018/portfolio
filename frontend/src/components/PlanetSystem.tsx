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
      <Planet
        color="#44ff99"
        orbitRadius={4}
        orbitSpeed={0.001}
        size={0.4}
        variant="metal"
        ring
        onClick={() => setSection('profile')}
      />

      <Planet
        color="#55aaff"
        orbitRadius={6}
        orbitSpeed={0.0008}
        size={0.75}
        variant="grid"
        ring
        onClick={() => setSection('tech')}
      />

      <Planet
        color="#cccccc"
        orbitRadius={8}
        orbitSpeed={0.0006}
        size={0.5}
        variant="holo"  // "metal" 'lowpoly' や 'toon' も試せます
        onClick={() => setSection('experience')}
      />
    </>
  )
}
