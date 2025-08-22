import PortfolioCanvas from './scenes/PortfolioCanvas'
import HeaderMenu from './components/HeaderMenu'

function App() {

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative' }}>
      <PortfolioCanvas />
      <HeaderMenu />
    </div>
  )
}

export default App

