import React from 'react'
import CardShell from './CardShell'

const TechStack: React.FC = () => {
  const sec: React.CSSProperties = { margin: 'clamp(8px, 1.4vw, 12px) 0' }
  const h4: React.CSSProperties = { margin: '6px 0', fontSize: 'clamp(13px,1.6vw,15px)', opacity: 0.9 }
  const ul: React.CSSProperties = { margin: 0, paddingLeft: 18 }
  const titleName: React.CSSProperties = { color: '#5fe4a2ff', fontWeight: 700 };

  return (
    <CardShell title="技術スタック" widthMin={300} widthMax={560}>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Frontend</span></h4>
        <ul style={ul}>
          <li>TypeScript / JavaScript  / Vite / React / Vue / Qwik / Dart</li>
          <li>Three.js / @react-three/fiber / drei</li>
          <li>Tailwind / CSS-in-JS / HTML</li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Backend</span></h4>
        <ul style={ul}>
          <li>Ruby on Rails / FastAPI</li>
          <li>PostgreSQL / MySQL / Redis</li>
          <li>Auth / REST </li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Graphics / ML （基礎）</span></h4>
        <ul style={ul}>
          <li>GLSL / PBR / PostProcess</li>
          <li>PyTorch / TensorFlow</li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}><span style={titleName}>Another</span></h4>
        <ul style={ul}>
          <li>Docker / Git / FVM</li>
          <li>C++ / Firebase</li>
        </ul>
      </section>
    </CardShell>
  )
}

export default TechStack
