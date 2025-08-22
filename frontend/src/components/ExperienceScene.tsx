import Overlay from "./Overlay";
import Profile from "../views/Profile";
import TechStack from "../views/TechStack";
import Experience from "../views/Experience";
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'


export default function ExperienceScene() {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  return (
    <>
      {/* Three.js シーン */}
      <Canvas shadows>
        {/* 惑星クリック時に setSelectedPlanet("profile" など) */}
      </Canvas>

      {/* 選択に応じたカード表示 */}
      {selectedPlanet === "profile" && (
        <Overlay onClose={() => setSelectedPlanet(null)}>
          <Profile />
        </Overlay>
      )}
      {selectedPlanet === "tech" && (
        <Overlay onClose={() => setSelectedPlanet(null)}>
          <TechStack />
        </Overlay>
      )}
      {selectedPlanet === "experience" && (
        <Overlay onClose={() => setSelectedPlanet(null)}>
          <Experience />
        </Overlay>
      )}
    </>
  );
}
