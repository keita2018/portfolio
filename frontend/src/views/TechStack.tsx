import React from 'react'
import CardShell from './CardShell'

const TechStack: React.FC = () => {
  const sec: React.CSSProperties = { margin: 'clamp(8px, 1.4vw, 12px) 0' }
  const h4: React.CSSProperties = { margin: '6px 0', fontSize: 'clamp(13px,1.6vw,15px)', opacity: 0.9 }
  const ul: React.CSSProperties = { margin: 0, paddingLeft: 18 }
  const titleName: React.CSSProperties = { color: '#5fe4a2ff', fontWeight: 700 };

  return (
    <CardShell title="技術スタック" widthMin={300} widthMax={560}>
      {/* 言語 */}
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Languages</span></h4>
        <ul style={ul}>
          <li>TypeScript / JavaScript / Dart / Ruby / Python / C++ / SQL</li>
          <li>HTML / CSS</li>
        </ul>
      </section>

      {/* フレームワーク / ライブラリ */}
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Frameworks & Libraries</span></h4>
        <ul style={ul}>
          <li>React / Vue / Qwik / Vite</li>
          <li>Ruby on Rails / FastAPI</li>
          <li>Three.js / @react-three/fiber / drei</li>
          <li>Tailwind CSS / CSS-in-JS</li>
        </ul>
      </section>

      {/* データベース / インフラ */}
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Databases & Infra</span></h4>
        <ul style={ul}>
          <li>PostgreSQL / MySQL / Redis</li>
          <li>Firebase</li>
          <li>Docker</li>
        </ul>
      </section>

      {/* グラフィックス / 機械学習 */}
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Graphics & Machine Learning</span></h4>
        <ul style={ul}>
          <li>GLSL / PBR / PostProcess</li>
          <li>PyTorch / TensorFlow</li>
        </ul>
      </section>

      {/* 開発ツール */}
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Tools</span></h4>
        <ul style={ul}>
          <li>Git / GitHub</li>
          <li>FVM</li>
        </ul>
      </section>
    </CardShell>
  )
}

export default TechStack
