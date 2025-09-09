// PortfolioCanvas.tsx
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import PlanetSystem from '../components/PlanetSystem'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { PerspectiveCamera, Stars, Environment, OrbitControls } from '@react-three/drei';
// import { useSectionStore } from '../stores/useSectionStore'

// import Profile from '../views/Profile'
// import TechStack from '../views/TechStack'
// import Experience from '../views/Experience'


export default function PortfolioCanvas() {
  // const section = useSectionStore((s) => s.section)
  // const setSection = useSectionStore((s) => s.setSection)
  // const { close } = useSectionStore()
  // console.log('SECTION', section)
  // console.log('STORE_ID', useSectionStore.getState) 

  // const cardContent =
  //   section === 'profile'    ? <Profile /> :
  //   section === 'tech'       ? <TechStack /> :
  //   section === 'experience' ? <Experience /> :
  //   null

  return (
    <Canvas 
      shadows
      camera={{ position: [0, 0, 12], fov: 45 }} 
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
      // onPointerMissed={() => setSection(null)}
    >
      {/* === ライト === */}
      {/* 全体をほんのり照らす（真っ暗防止用） */}
      <ambientLight intensity={0.1} />

      {/* 太陽を光源に見立てる（中心） */}
      <pointLight
        position={[0, 0, 0]} // 太陽の位置と同じ
        intensity={2.5}      // 光の強さ（強すぎたら調整）
        distance={50}        // 届く範囲
        decay={2}            // 減衰率
        color={'#ffffcc'}    // 少し黄色っぽい光
        castShadow
        shadow-bias={-0.0005}
        shadow-normalBias={0.02} 
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
      />

      {/* 影のメリハリをさらに出したい場合は補助の平行光も有効 */}
      <directionalLight
        castShadow
        position={[12, 8, 10]}
        intensity={0.6}
        color={'#ffe0b3'}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
      />

      {/* カメラ */}
      <PerspectiveCamera
        makeDefault
        position={[-15.5, -11, 50]} // ← 高さ5、奥行き10の位置に配置（Z遠め）
        rotation={[0.5, 0, 0]} // ← 軽く下向きに回転（Y回転なし）
        fov={50}
      />

      {/* 星空背景 */}
      <Stars
        radius={100}      // 星を配置する球体の半径（広がり）
        depth={50}        // 星の奥行き（Z軸方向の範囲）
        count={5000}      // 星の数
        factor={4}        // 星の光の強さ（大きさに影響）
        saturation={0}    // 色の鮮やかさ（0 = 白）
        fade              // 遠い星をフェードアウト
      />
      <Environment preset="city" environmentIntensity={0.4} />

      {/* 影を見せたいなら「薄い受け面」を後ろに置く（任意） */}
      {/* <ShadowSheet /> */}

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

      {/* <Html fullscreen transform={false}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',    // 全体はクリックを通す
          }}
        >
          <div
            style={{
              // カード本体
              minWidth: 420,
              maxWidth: 'min(85vw, 960px)',
              maxHeight: '80vh',
              overflow: 'auto',
              background: 'rgba(12,12,12,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              // フェード演出
              opacity: cardContent ? 1 : 0,
              transform: cardContent ? 'scale(1)' : 'scale(0.98)',
              transition: 'opacity 220ms ease, transform 220ms ease',
              // カード内の操作を有効化
              pointerEvents: cardContent ? 'auto' : 'none',
            }}
          >
            {cardContent}
          </div>
        </div>
      </Html> */}

      <OrbitControls
       enableDamping
       enableZoom={false}
       // enableRotate={!section}
      />
    </Canvas>
  )
}