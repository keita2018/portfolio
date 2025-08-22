// src/components/PlanetSystem.tsx
import Planet from './Planet'
import Sun from './Sun'
import { useSectionStore } from '../stores/useSectionStore'
import Profile from '../views/Profile'
import TechStack from '../views/TechStack'
import Experience from '../views/Experience'

export default function PlanetSystem() {
  const section = useSectionStore((s) => s.section)
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
        isFocused={section === 'profile'}
        showCard={section === 'profile'}
        cardContent={<Profile />}
        cardRotation={[ 0.57, 0, 0 ]}
        appearSpin={Math.PI * 0.8}
        appearOvershoot={0.06}
      />

      <Planet
        color="#55aaff"
        orbitRadius={6}
        orbitSpeed={0.0008}
        size={0.75}
        variant="grid"
        ring
        onClick={() => setSection('tech')}
        isFocused={section === 'tech'}
        showCard={section === 'tech'}
        cardContent={<TechStack />}
        cardRotation={[ 0.57, 0, 0 ]}
        appearSpin={Math.PI * 1.4}
        appearOvershoot={0.1}
      />

      <Planet
        color="#cccccc"
        orbitRadius={8}
        orbitSpeed={0.0006}
        size={0.5}
        variant="holo"  // "metal" 'lowpoly' や 'toon' も試せます
        onClick={() => setSection('experience')}
        isFocused={section === 'experience'}
        showCard={section === 'experience'}
        cardContent={<Experience />}
        cardRotation={[ 0.57, 0, 0 ]}
        appearSpin={Math.PI * 1.0}
        appearOvershoot={0.08}
      />
    </>
  )
}
