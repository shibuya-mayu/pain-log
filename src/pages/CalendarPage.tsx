import { useMemo } from 'react'
import { DayPanel } from '../components/DayPanel'
import { addDays, daysBetween, fmt, parse, today } from '../lib/date'
import type { Draft } from '../lib/drafts'
import { useData } from '../lib/data'
import { levelClass } from '../lib/pain'
import { activityShort, dayAvg, dayMax } from '../lib/stats'
import type { ExerciseRecord } from '../lib/types'

interface Props {
  ym: string
  setYm: (ym: string) => void
  sel: string
  setSel: (ds: string) => void
  onOpen: (d: Draft) => void
}

export function CalendarPage({ ym, setYm, sel, setSel, onOpen }: Props) {
  const { records, idx, types, settings } = useData()
  const [y, m] = ym.split('-').map(Number)
  const now = today()

  const cells = useMemo(() => {
    const first = new Date(y, m - 1, 1)
    const start = fmt(new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7))) // 月曜始まり
    const list: string[] = []
    for (let i = 0; i < 42; i++) {
      const ds = addDays(start, i)
      if (i === 35 && parse(ds).getMonth() !== m - 1) break
      list.push(ds)
    }
    return list
  }, [y, m])

  const moveMonth = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    setYm(fmt(d).slice(0, 7))
  }

  const backupDue = useMemo(() => {
    if (records.length < 5) return false
    const since = settings.lastBackupAt?.slice(0, 10) ?? records.reduce((min, r) => (r.date < min ? r.date : min), now)
    return daysBetween(since, now) >= 30
  }, [records, settings.lastBackupAt, now])

  return (
    <>
      <header className="top">
        <h1>{y}年{m}月</h1>
        <button className="iconbtn" aria-label="前の月" onClick={() => moveMonth(-1)}>‹</button>
        <button className="iconbtn" onClick={() => { setYm(now.slice(0, 7)); setSel(now) }}>今日</button>
        <button className="iconbtn" aria-label="次の月" onClick={() => moveMonth(1)}>›</button>
      </header>
      <div className="section stack">
        {backupDue && (
          <div className="notice">
            <span>最後のバックアップから30日以上たちました。設定から書き出してください。</span>
          </div>
        )}
        <div className="cal">
          <div className="cal-head">{[...'月火水木金土日'].map((w) => <div key={w}>{w}</div>)}</div>
          <div className="cal-grid">
            {cells.map((ds) => {
              const d = parse(ds)
              const recs = idx.get(ds) ?? []
              const raw = settings.calMode === 'avg' ? dayAvg(idx, ds) : dayMax(idx, ds)
              const v = raw == null ? null : settings.calMode === 'avg' ? Math.round(raw * 10) / 10 : raw
              const acts = recs.filter((r): r is ExerciseRecord => r.kind === 'exercise').flatMap((r) => r.activities)
              const cls = ['day', d.getMonth() !== m - 1 && 'out', d.getDay() === 0 && 'sun', d.getDay() === 6 && 'sat', ds === now && 'today', ds === sel && 'sel']
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={ds}
                  className={cls}
                  aria-label={`${d.getMonth() + 1}月${d.getDate()}日${v != null ? ` 痛み${v}` : ''}${acts.length ? ` 運動${acts.length}件` : ''}`}
                  aria-pressed={ds === sel}
                  onClick={() => {
                    setSel(ds)
                    if (ds.slice(0, 7) !== ym) setYm(ds.slice(0, 7))
                  }}
                >
                  <span className="dn num">{d.getDate()}</span>
                  {v != null && <span className={`badge num ${levelClass(Math.round(v))}`}>{v}</span>}
                  <span className="chips">
                    {acts.map((a, i) => <span key={i} className="chip-ex">{activityShort(a, types)}</span>)}
                    {!acts.length && recs.length > 0 && <span className="chip-pain">痛</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="legend">
          <span>右上の数字＝その日の痛みの{settings.calMode === 'avg' ? '平均' : '最大値'}</span>
          <span className="sw">{[0, 2, 4, 6, 8, 10].map((v) => <span key={v} className={`${levelClass(v)} num`}>{v}</span>)}</span>
          <span><span className="chip-pain">痛</span> 痛みのみの記録</span>
        </div>
        {records.length === 0 && (
          <p className="empty">右下の「＋」から最初の記録をつけましょう。</p>
        )}
        <DayPanel ds={sel} onOpen={onOpen} />
      </div>
    </>
  )
}
