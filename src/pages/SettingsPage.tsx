import { useRef, useState } from 'react'
import { exportBackup, parseBackup, restoreBackup, type BackupFile } from '../lib/backup'
import { db, newId, saveSettings } from '../lib/db'
import { OTHER_TYPE_ID } from '../lib/defaults'
import { useData } from '../lib/data'
import type { Settings } from '../lib/types'

type Sub = null | 'types' | 'parts' | 'tags' | 'moves' | 'dailyMoves'

export function SettingsPage() {
  const { settings, types, parts, records, toast } = useData()
  const [sub, setSub] = useState<Sub>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (sub === 'types' || sub === 'parts') return <MasterTable kind={sub} onBack={() => setSub(null)} />
  if (sub === 'tags' || sub === 'moves' || sub === 'dailyMoves') return <StringList kind={sub} onBack={() => setSub(null)} />

  const set = (patch: Partial<Settings>) => {
    void saveSettings(patch)
    toast('変更しました')
  }
  const seg = <K extends keyof Settings>(k: K, opts: [Settings[K], string][]) => (
    <span className="seg" role="group">
      {opts.map(([v, l]) => (
        <button type="button" key={String(v)} aria-pressed={settings[k] === v} onClick={() => set({ [k]: v } as Partial<Settings>)}>{l}</button>
      ))}
    </span>
  )

  const onExport = async () => {
    try {
      const r = await exportBackup()
      if (r !== 'cancelled') toast('バックアップを書き出しました')
    } catch {
      toast('書き出せませんでした。もう一度試してください')
    }
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setImportError('')
      setPending(parseBackup(await f.text()))
    } catch (err) {
      setImportError((err as Error).message)
    }
  }

  const onRestore = async () => {
    if (!pending) return
    await restoreBackup(pending)
    setPending(null)
    toast(`${pending.records.length}件の記録を読み込みました`)
  }

  const lastBackup = settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString('ja-JP') : 'まだありません'

  return (
    <>
      <header className="top"><h1>設定</h1></header>
      <div className="section">
        <div className="grp">入力の候補（追加・非表示ができます）</div>
        <div className="list">
          <div><h3>運動の種類</h3><button className="btn small" onClick={() => setSub('types')}>{types.filter((t) => !t.hidden).length}件 ›</button></div>
          <div><h3>痛みの部位</h3><button className="btn small" onClick={() => setSub('parts')}>{parts.filter((t) => !t.hidden).length}件 ›</button></div>
          <div><h3>運動中に痛んだ動き</h3><button className="btn small" onClick={() => setSub('moves')}>{settings.moves.length}件 ›</button></div>
          <div><h3>日常で痛んだ動き</h3><button className="btn small" onClick={() => setSub('dailyMoves')}>{settings.dailyMoves.length}件 ›</button></div>
          <div><h3>痛みの種類タグを使う</h3>{seg('useTags', [[false, 'オフ'], [true, 'オン']])}</div>
          {settings.useTags && <div><h3>痛みの種類タグ</h3><button className="btn small" onClick={() => setSub('tags')}>{settings.tags.length}件 ›</button></div>}
          <div><h3>「続けて追加」の目安</h3>{seg('gapMin', [[30, '30分'], [60, '60分']])}</div>
        </div>

        <div className="grp">表示</div>
        <div className="list">
          <div><h3>カレンダーの数字</h3>{seg('calMode', [['max', '最大値'], ['avg', '平均']])}</div>
          <div><h3>強度グラフの表示</h3>{seg('intView', [['3', '3つにまとめる'], ['5', '5段階']])}</div>
        </div>

        <div className="grp">データ（記録 {records.length} 件）</div>
        <div className="list">
          <div><h3>バックアップを書き出す</h3><button className="btn small" onClick={onExport}>書き出す</button></div>
          <div>
            <h3>バックアップから読み込む</h3>
            <button className="btn small" onClick={() => fileRef.current?.click()}>読み込む</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPick} />
          </div>
          <div><span className="small muted">最終バックアップ: {lastBackup}</span></div>
        </div>
        {importError && <p className="err" role="alert">{importError}</p>}
        {pending && (
          <div className="notice" style={{ marginTop: 10 }}>
            <span>
              今の記録 {records.length} 件を消して、バックアップの記録 {pending.records.length} 件（{new Date(pending.exportedAt).toLocaleDateString('ja-JP')} 書き出し）に置き換えます。
            </span>
            <span className="row">
              <button className="btn small" onClick={() => setPending(null)}>やめる</button>
              <button className="btn small primary" onClick={onRestore}>置き換える</button>
            </span>
          </div>
        )}
        <p className="small muted">
          データはこのスマホの中に保存されます。機種変更のときは「書き出す」で iCloud Drive などにファイルを保存し、新しいスマホで「読み込む」と引き継げます。
        </p>
        {import.meta.env.DEV && <DevTools />}
      </div>
    </>
  )
}

function DevTools() {
  const { toast } = useData()
  return (
    <>
      <div className="grp">開発用（公開版には表示されません）</div>
      <div className="list">
        <div>
          <h3>サンプルデータを入れる</h3>
          <button className="btn small" onClick={async () => {
            try {
              const { makeSample } = await import('../lib/sample')
              await db.records.clear()
              await db.records.bulkAdd(makeSample())
              toast('サンプルデータを入れました')
            } catch (e) {
              toast(`入れられませんでした: ${(e as Error).message}`)
            }
          }}>入れる</button>
        </div>
        <div><h3>記録をすべて消す</h3><button className="btn small danger" onClick={async () => { await db.records.clear(); toast('消しました') }}>消す</button></div>
      </div>
    </>
  )
}

function MasterTable({ kind, onBack }: { kind: 'types' | 'parts'; onBack: () => void }) {
  const { types, parts, toast } = useData()
  const [name, setName] = useState('')
  const items = kind === 'types' ? types : parts
  const table = kind === 'types' ? db.types : db.parts
  const title = kind === 'types' ? '運動の種類' : '痛みの部位'

  const move = async (i: number, dir: -1 | 1) => {
    const a = items[i]
    const b = items[i + dir]
    if (!a || !b) return
    await db.transaction('rw', table, async () => {
      await table.update(a.id, { order: b.order })
      await table.update(b.id, { order: a.order })
    })
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const order = Math.max(0, ...items.map((x) => x.order)) + 1
    // 「その他」は常に最後に置く
    const other = items.find((x) => x.id === OTHER_TYPE_ID)
    if (kind === 'types') {
      await db.types.add({ id: newId(), name: n, short: n.slice(0, 2), defaultMinutes: 30, order: other ? other.order : order, hidden: false })
      if (other) await db.types.update(other.id, { order })
    } else {
      await db.parts.add({ id: newId(), name: n, order: other ? other.order : order, hidden: false })
      if (other) await db.parts.update(other.id, { order })
    }
    setName('')
    toast(`「${n}」を追加しました`)
  }

  return (
    <>
      <header className="top"><button className="iconbtn" aria-label="戻る" onClick={onBack}>‹</button><h1>{title}</h1></header>
      <div className="section stack">
        <div className="list">
          {items.map((t, i) => (
            <div key={t.id} className={`master-row${t.hidden ? ' hidden-item' : ''}`}>
              <div className="inputs">
                <input className="inp" aria-label="名前" defaultValue={t.name} onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && table.update(t.id, { name: e.target.value.trim() })} />
                {(() => { const tt = kind === 'types' ? types.find((x) => x.id === t.id) : undefined; return tt && (
                  <>
                    <input className="inp" style={{ width: 56 }} aria-label="カレンダー表示名" maxLength={3} defaultValue={tt.short} onBlur={(e) => e.target.value.trim() && db.types.update(t.id, { short: e.target.value.trim() })} />
                    <input className="inp num" style={{ width: 64 }} type="number" inputMode="numeric" aria-label="標準の時間（分）" defaultValue={tt.defaultMinutes} onBlur={(e) => Number(e.target.value) > 0 && db.types.update(t.id, { defaultMinutes: Number(e.target.value) })} />
                  </>
                ) })()}
              </div>
              <div className="ops">
                <button className="x" aria-label="上へ" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="x" aria-label="下へ" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="btn small" onClick={() => table.update(t.id, { hidden: !t.hidden })}>{t.hidden ? '表示' : '隠す'}</button>
              </div>
            </div>
          ))}
        </div>
        {kind === 'types' && <p className="small muted" style={{ margin: 0 }}>左から: 名前・カレンダーに出す略称（3文字まで）・標準の時間（分）</p>}
        <form className="row" onSubmit={add}>
          <input className="inp" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={`追加する名前（例: ${kind === 'types' ? 'ピラティス' : 'ふくらはぎ'}）`} />
          <button className="btn primary">追加</button>
        </form>
        <p className="small muted" style={{ margin: 0 }}>隠しても、過去の記録とグラフには残ります。</p>
      </div>
    </>
  )
}

const LIST_TEXT = {
  tags: { title: '痛みの種類タグ', example: 'しびれ' },
  moves: { title: '運動中に痛んだ動き', example: 'ターン' },
  dailyMoves: { title: '日常で痛んだ動き', example: '自転車をこぐ' },
} as const

function StringList({ kind, onBack }: { kind: 'tags' | 'moves' | 'dailyMoves'; onBack: () => void }) {
  const { settings, toast } = useData()
  const [name, setName] = useState('')
  const list = settings[kind]
  const { title, example } = LIST_TEXT[kind]

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n || list.includes(n)) return
    void saveSettings({ [kind]: [...list, n] })
    setName('')
    toast(`「${n}」を追加しました`)
  }

  return (
    <>
      <header className="top"><button className="iconbtn" aria-label="戻る" onClick={onBack}>‹</button><h1>{title}</h1></header>
      <div className="section stack">
        <div className="list">
          {list.map((t, i) => (
            <div key={t}>
              <h3>{t}</h3>
              <span className="ops row" style={{ gap: 2 }}>
                <button className="x" aria-label="上へ" disabled={i === 0} onClick={() => { const l = [...list]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; void saveSettings({ [kind]: l }) }}>↑</button>
                <button className="btn small danger" onClick={() => void saveSettings({ [kind]: list.filter((x) => x !== t) })}>削除</button>
              </span>
            </div>
          ))}
        </div>
        <form className="row" onSubmit={add}>
          <input className="inp" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={`追加する名前（例: ${example}）`} />
          <button className="btn primary">追加</button>
        </form>
        <p className="small muted" style={{ margin: 0 }}>削除しても、過去の記録には残ります。</p>
      </div>
    </>
  )
}
