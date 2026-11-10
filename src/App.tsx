import { lazy, Suspense, useState } from 'react'
import { RecordSheet } from './components/RecordSheet'
import { newExercise, newPain, type Draft } from './lib/drafts'
import { today } from './lib/date'
import { useData } from './lib/data'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'

// グラフのライブラリは大きいので、グラフ画面を開いたときに読み込む
const GraphPage = lazy(() => import('./pages/GraphPage').then((m) => ({ default: m.GraphPage })))

type Tab = 'calendar' | 'graph' | 'settings'

export default function App() {
  const { ready } = useData()
  const [tab, setTab] = useState<Tab>('calendar')
  const [sel, setSel] = useState(today())
  const [ym, setYm] = useState(today().slice(0, 7))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  const open = (d: Draft) => {
    setFabOpen(false)
    setDraft(d)
  }
  const onSaved = (date: string) => {
    setSel(date)
    setYm(date.slice(0, 7))
    setTab('calendar')
  }

  if (!ready) return null

  return (
    <>
      <div className="app" aria-hidden={draft ? true : undefined}>
        {tab === 'calendar' && <CalendarPage ym={ym} setYm={setYm} sel={sel} setSel={setSel} onOpen={open} />}
        {tab === 'graph' && <Suspense fallback={<p className="empty">読み込み中…</p>}><GraphPage /></Suspense>}
        {tab === 'settings' && <SettingsPage />}
      </div>

      <nav className="tabs" aria-label="メイン">
        <div className="tabs-in">
          <TabButton id="calendar" label="カレンダー" cur={tab} set={setTab}>
            <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" />
          </TabButton>
          <TabButton id="graph" label="グラフ" cur={tab} set={setTab}>
            <path d="M4 20V4M4 20h16" /><path d="M7 15l4-5 3 3 5-7" />
          </TabButton>
          <TabButton id="settings" label="設定" cur={tab} set={setTab}>
            <circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
          </TabButton>
        </div>
      </nav>

      {tab === 'calendar' && (
        <>
          {fabOpen && <button className="scrim" aria-label="閉じる" onClick={() => setFabOpen(false)} />}
          {fabOpen && (
            <div className="fabmenu">
              <button className="btn" onClick={() => open(newExercise(today()))}>運動を記録</button>
              <button className="btn" onClick={() => open(newPain(today()))}>痛みだけ記録</button>
            </div>
          )}
          <button className="fab" aria-label="今日の記録を追加" aria-expanded={fabOpen} onClick={() => setFabOpen(!fabOpen)}>
            {fabOpen ? '×' : '＋'}
          </button>
        </>
      )}

      {draft && <RecordSheet key={draft.id ?? 'new'} initial={draft} onClose={() => setDraft(null)} onSaved={onSaved} onSwitch={setDraft} />}
    </>
  )
}

function TabButton({ id, label, cur, set, children }: { id: Tab; label: string; cur: Tab; set: (t: Tab) => void; children: React.ReactNode }) {
  return (
    <button
      className="tab"
      aria-current={cur === id ? 'page' : undefined}
      onClick={() => {
        set(id)
        window.scrollTo(0, 0)
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{children}</svg>
      {label}
    </button>
  )
}
