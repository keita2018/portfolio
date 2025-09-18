// PortfolioCanvas.tsx (safe lightweight)
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import PlanetSystem from '../components/PlanetSystem'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import {
  PerspectiveCamera,
  Stars,
  Environment,
  OrbitControls,
  AdaptiveDpr,
  AdaptiveEvents,
} from '@react-three/drei'

export default function PortfolioCanvas() {
  return (
    <Canvas
      // 端末に応じて解像度を抑える
      dpr={[1, 1.5]}
      // アンチエイリアスを切って描画負荷を低減
      gl={{ antialias: false }}
      shadows
      camera={{ position: [0, 0, 12], fov: 45 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000', 1)
        gl.shadowMap.enabled = true
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      {/* 自動でDPR/イベント負荷を下げる（描画品質を動的に調整） */}
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* === ライト（軽量構成） === */}
      <ambientLight intensity={0.5} />
      {/* 太陽のライトは影OFFでコスト削減 */}
      <pointLight
        position={[0, 0, 0]}
        intensity={1.2}
        distance={40}
        decay={2}
        color={'#ffffcc'}
        castShadow={false}
      />
      {/* 影を出すのは1灯のみ＆低解像度に */}
      <directionalLight
        castShadow
        position={[12, 8, 10]}
        intensity={0.4}
        color={'#ffe0b3'}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0002}
      />

      {/* === カメラ === */}
      <PerspectiveCamera
        makeDefault
        position={[-15.5, -11, 50]}
        rotation={[0.5, 0, 0]}
        fov={50}
      />

      {/* === 星空（数・スケールを抑制） === */}
      <Stars
        radius={70}   // 100→70
        depth={30}    // 50→30
        count={1500}  // 5000→1500
        factor={2.5}  // 4→2.5
        saturation={0}
        fade
      />

      {/* IBLは弱めに維持（完全OFFでも可） */}
      <Environment preset="city" environmentIntensity={0.15} />

      {/* === 太陽と惑星たち === */}
      <PlanetSystem />

      {/* === Bloom（軽量設定） === */}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
        />
      </EffectComposer>

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enableZoom={false}
      />
    </Canvas>
  )
}
