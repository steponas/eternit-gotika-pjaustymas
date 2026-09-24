import { lt } from './i18n/lt'
import { useAppState } from './state/useAppState'
import { RoofScreen } from './ui/RoofScreen'
import { SheetScreen } from './ui/SheetScreen'
import './styles/app.css'

export default function App() {
  const state = useAppState()

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">{lt.appTitle}</h1>
        <nav className="app-header__nav" aria-label="Ekranai">
          <button
            type="button"
            className={`btn btn--nav${state.screen === 'roof' ? ' is-active' : ''}`}
            onClick={() => state.setScreen('roof')}
          >
            {lt.screenRoof}
          </button>
          <button
            type="button"
            className={`btn btn--nav${state.screen === 'sheet' ? ' is-active' : ''}`}
            onClick={() => state.setScreen('sheet')}
          >
            {lt.screenSheet}
          </button>
        </nav>
      </header>
      <main className="app-main">
        {state.screen === 'roof' ? (
          <RoofScreen state={state} />
        ) : (
          <SheetScreen state={state} />
        )}
      </main>
    </div>
  )
}
