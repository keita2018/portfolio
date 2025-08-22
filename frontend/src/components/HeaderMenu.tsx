// src/components/HeaderMenu.tsx
import { useSectionStore } from '../stores/useSectionStore'

export default function HeaderMenu() {
  const setSection = useSectionStore((s) => s.setSection)

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        lineHeight: '1.8',
        fontSize: '30px',
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>ポートフォリオ</div>
      <div style={{ cursor: 'pointer' }} onClick={() => setSection('profile')}>
        プロフィール
      </div>
      <div style={{ cursor: 'pointer' }} onClick={() => setSection('tech')}>
        技術スタック
      </div>
      <div style={{ cursor: 'pointer' }} onClick={() => setSection('experience')}>
        開発経験
      </div>
    </div>
  )
}
