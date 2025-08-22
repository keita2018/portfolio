import PortfolioCanvas from './scenes/PortfolioCanvas'
import HeaderMenu from './components/HeaderMenu'
import { useSectionStore } from './stores/useSectionStore'

function App() {
  const section = useSectionStore((s) => s.section)

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative' }}>
      <PortfolioCanvas />
      <HeaderMenu />

      {section !== 'none' && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            background: 'rgba(255,255,255,0.9)',
            padding: '1rem',
            borderRadius: '8px',
            width: '300px',
          }}
        >
          {section === 'profile' && <p>これはプロフィールの内容です。</p>}
          {section === 'tech' && <p>これは技術スタックの内容です。</p>}
          {section === 'experience' && <p>これは開発経験の内容です。</p>}
        </div>
      )}
    </div>
  )
}

export default App
