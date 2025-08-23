import React from 'react'
import CardShell from './CardShell'

const Experience: React.FC = () => {
  const sec: React.CSSProperties = { margin: 'clamp(8px, 1.4vw, 12px) 0' }
  const h4: React.CSSProperties = { margin: '6px 0', fontSize: 'clamp(13px,1.6vw,15px)', opacity: 0.9 }
  const ul: React.CSSProperties = { margin: 0, paddingLeft: 18 }

  return (
    <CardShell title="開発経験" widthMin={300} widthMax={580}>
      <section style={sec}>
        <h4 style={h4}>研究 / プロジェクト</h4>
        <ul style={ul}>
          <li>視線トラッキング × WebGL インタラクション</li>
          <li>教育向け 3D ビジュアライゼーション（Three.js）</li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}>Web アプリ</h4>
        <ul style={ul}>
          <li>リアルタイム掲示板（React + WS + Redis）</li>
          <li>予約システム（React + Node + PostgreSQL）</li>
        </ul>
      </section>
      <section style={sec}>
        <h4 style={h4}>その他</h4>
        <ul style={ul}>
          <li>CI/CD、Lighthouse パフォーマンス改善</li>
          <li>アクセシビリティ改善、E2E テスト整備</li>
        </ul>
      </section>
    </CardShell>
  )
}

export default Experience
