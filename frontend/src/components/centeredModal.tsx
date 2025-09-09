// src/components/CenteredModal.tsx
import { createPortal } from 'react-dom'
import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function CenteredModal({ open, onClose, children }: Props) {
  if (!open) return null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,                // Canvasより手前に
        display: open ? 'grid' : 'none', 
        placeItems: 'center',
      }}
    >
      {/* 暗幕（クリックで閉じる） */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
        }}
      />
      {/* カード本体（クリックは外へ抜けない） */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: 420,
          maxWidth: 'min(85vw, 960px)',
          maxHeight: '80vh',
          overflow: 'auto',
          background: 'rgba(12,12,12,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
