// src/components/HeaderMenu.tsx
import { useSectionStore } from '../stores/useSectionStore'

export default function HeaderMenu() {
  const section = useSectionStore((s) => s.section)
  const { open, close } = useSectionStore()

  const Item = ({ label, value }: { label: string; value: 'profile'|'tech'|'experience' }) => {
    const active = section === value
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(value) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(value) }
          if (e.key === 'Escape') close()
        }}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          padding: '2px 6px',
          margin: '2px 0',
          borderRadius: 8,
          background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
          color: 'white',
        }}
      >
        {label}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        lineHeight: '1.8',
        fontSize: '30px',
        zIndex: 1000,          // モーダル暗幕より上でもOK
        pointerEvents: 'auto',
      }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }} 
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>ポートフォリオ</div>
      <Item label="プロフィール" value="profile" />
      <Item label="技術スタック" value="tech" />
      <Item label="研究情報・開発経験" value="experience" />
      {/* {section && (
        <div
          style={{ marginTop: 8, fontSize: 18, opacity: 0.8, cursor: 'pointer' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); close() }}
        >
          × 閉じる
        </div>
      )} */}
    </div>
  )
}
