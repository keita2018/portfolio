// import PortfolioCanvas from './scenes/PortfolioCanvas'
// import HeaderMenu from './components/HeaderMenu'

// function App() {

//   return (
//     <div style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative' }}>
//       <PortfolioCanvas />
//       <HeaderMenu />
//     </div>
//   )
// }

// export default App


// src/App.tsx
import PortfolioCanvas from './scenes/PortfolioCanvas'
import HeaderMenu from './components/HeaderMenu'
import CenteredModal from './components/centeredModal'
import { useSectionStore } from './stores/useSectionStore'

// カードの中身
import Profile from './views/Profile'
import TechStack from './views/TechStack'
import Experience from './views/Experience'

export default function App() {
  const section = useSectionStore((s) => s.section)
  const { close } = useSectionStore()

  const cardContent =
    section === 'profile'    ? <Profile /> :
    section === 'tech'       ? <TechStack /> :
    section === 'experience' ? <Experience /> :
    null

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative' }}>
      {/* 3Dシーン */}
      <PortfolioCanvas />

      {/* ヘッダ（上に重ねる） */}
      <HeaderMenu />

      {/* ★ Canvasの外でモーダルを出す（干渉しない） */}
      <CenteredModal open={!!section} onClose={close}>
        {cardContent}
      </CenteredModal>
    </div>
  )
}
