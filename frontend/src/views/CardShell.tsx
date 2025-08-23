// src/views/CardShell.tsx
import React from 'react'

type CardShellProps = {
  title?: string
  children: React.ReactNode
  widthMin?: number // px
  widthMax?: number // px
}

const CardShell: React.FC<CardShellProps> = ({
  title,
  children,
  widthMin = 280,
  widthMax = 520,
}) => {
  const card: React.CSSProperties = {
    // 幅は画面に合わせて流体化
    width: `clamp(${widthMin}px, 88vw, ${widthMax}px)`,
    maxWidth: 'calc(100svw - 24px)',
    // 余白も流体
    padding: 'clamp(14px, 2.5vw, 20px)',
    color: '#fff',
    background: 'linear-gradient(180deg, rgba(10,10,10,0.85), rgba(10,10,10,0.65))',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 'clamp(10px, 1.6vw, 14px)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  }

  const header: React.CSSProperties = {
    fontSize: 'clamp(13px, 1.6vw, 16px)',
    opacity: 0.85,
    marginBottom: 'clamp(6px, 1vw, 10px)',
    letterSpacing: 1.1,
  }

  const body: React.CSSProperties = {
    // 本文領域は高さに応じてスクロール
    maxHeight: 'min(65vh, 560px)',
    overflow: 'auto',
    lineHeight: 1.6,
    fontSize: 'clamp(13px, 1.5vw, 15px)',
    opacity: 0.96,
  }

  // 小さめのスクロールバー（WebKit系）
  const scrollStyles = (
    <style>{`
      .card-shell::-webkit-scrollbar { width: 8px; }
      .card-shell::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 8px; }
      @media (prefers-reduced-motion: reduce) {
        * { scroll-behavior: auto !important; }
      }
    `}</style>
  )

  return (
    <div style={card} onClick={(e) => e.stopPropagation()}>
      {scrollStyles}
      {title && <div style={header}>{title}</div>}
      <div className="card-shell" style={body}>{children}</div>
    </div>
  )
}

export default CardShell
