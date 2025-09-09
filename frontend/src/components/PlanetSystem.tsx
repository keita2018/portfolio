// src/components/PlanetSystem.tsx
import Planet from './Planet'
import Sun from './Sun'
import { useSectionStore } from '../stores/useSectionStore'
import Profile from '../views/Profile'
import TechStack from '../views/TechStack'
import Experience from '../views/Experience'
import VoxelColumnSphereDual from "./VoxelSun";

export default function PlanetSystem() {
  const section = useSectionStore((s) => s.section)
  const setSection = useSectionStore((s) => s.setSection)

  return (
    <>
      {/* 太陽 */}
      {/* <Sun /> */}
      <VoxelColumnSphereDual
        columnsPhi={48}
        columnsTheta={32}
        core={{
          radius: 4,
          columnSide: 0.26,
          minLen: 0.6,
          maxLen: 1.0,
          jitter: 0.04,
          colors: [
            { color: "#ff9900", ratio: 0.6 },
            { color: "#ff3300", ratio: 0.3 },
            { color: "#000000", ratio: 0.1 },
          ],
          emissive: "#ffffff",
          emissiveIntensity: 1.0,
          emissiveColors: [
            { color: "#ff7a00", ratio: 0.2, intensity: 1.0 },
            { color: "#ff3b00", ratio: 0.75, intensity: 1.2 },
            { color: "#220000", ratio: 0.05, intensity: 0.3 },
          ],
        }}
        shell={{
          radius: 5.2,
          columnSide: 0.30,
          minLen: 0.9,
          maxLen: 1.8,
          jitter: 0.06,
          colors: [
            { color: "#ff9900", ratio: 0.6 },
            { color: "#ff3300", ratio: 0.3 },
            { color: "#000000", ratio: 0.1 },
          ],
          flicker: true,
          flickerSpeed: 1.2,
          flickerAmp: 0.18,
          emissive: "#ffffff",
          emissiveIntensity: 1.0,
          emissiveColors: [
            { color: "#ff7a00", ratio: 0.2, intensity: 1.2 },
            { color: "#bd600a", ratio: 0.2, intensity: 1.2 },
            { color: "#ff3b00", ratio: 0.29, intensity: 1.0 },
            { color: "#ff0000", ratio: 0.29, intensity: 1.0 },
            { color: "#220000", ratio: 0.02, intensity: 0.3 },
          ],
        }}
        phiStagger={0.5}
        counterRotate={0.15}
        gapSafety={0.05}
      />

      {/* 惑星たち */}
      <Planet
        color="#44ff99"
        orbitRadius={18}
        orbitSpeed={0.002}
        size={1.5}
        variant="metal"
        // ring
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
        orbitRadius={24}
        orbitSpeed={0.001}
        size={2}
        variant="grid"
        // ring
        onClick={() => setSection('tech')}
        isFocused={section === 'tech'}
        showCard={section === 'tech'}
        cardContent={<TechStack />}
        cardRotation={[ 0.57, 0, 0 ]}
        appearSpin={Math.PI * 1.4}
        appearOvershoot={0.1}
        orbitEuler={[-0.6, 0.8, 0.15]}
      />

      <Planet
        color="#cccccc"
        orbitRadius={30}
        orbitSpeed={0.0005}
        size={3}
        variant="holo"  // "metal" 'lowpoly' や 'toon' も試せます
        onClick={() => setSection('experience')}
        isFocused={section === 'experience'}
        showCard={section === 'experience'}
        cardContent={<Experience />}
        cardRotation={[ 0.57, 0, 0 ]}
        appearSpin={Math.PI * 1.0}
        appearOvershoot={0.08}
        orbitEuler={[0.7, -0.3, 0]}
        // phaseOffset={Math.PI * 0.6}
      />
    </>
  )
}
