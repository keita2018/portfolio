// PortfolioCanvas.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import PlanetSystem from '../components/PlanetSystem'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { PerspectiveCamera } from '@react-three/drei';


export default function PortfolioCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={5} />
      <PerspectiveCamera
        makeDefault
        position={[-4.5, -3, 8]} // ← 高さ5、奥行き10の位置に配置（Z遠め）
        rotation={[0.5, 0, 0]} // ← 軽く下向きに回転（Y回転なし）
        fov={50}
      />

      {/* 太陽と惑星たち */}
      <PlanetSystem />

      {/* Bloomエフェクト */}
      <EffectComposer>
        <Bloom
          intensity={1.5}     // 発光の強さ
          luminanceThreshold={0.2}  // 発光し始める明るさのしきい値
          luminanceSmoothing={0.9} // なだらかにする
        />
      </EffectComposer>
    </Canvas>
  )
}