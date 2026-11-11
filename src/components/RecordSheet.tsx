import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteRecord, saveRecord } from '../lib/db'
import { INTENSITIES, OTHER_TYPE_ID, QUICK_MINUTES, TIMINGS } from '../lib/defaults'
import { finalize, newActivity, toDraft, type ActivityDraft, type Draft, type ExerciseDraft, type PainDraft } from '../lib/drafts'
import { useData } from '../lib/data'
import { f1 } from '../lib/pain'
import { activityName, activityShort, frequentCombos, typeHistory } from '../lib/stats'
import type { Activity, ExerciseRecord } from '../lib/types'
import { PainSetEditor } from './PainSetEditor'

interface Props {
  initial: Draft
  onClose: () => void
  onSaved: (date: string) => void
  onSwitch: (d: Draft) => void
}

export function RecordSheet({ initial, onClose, onSaved, onSwitch }: Props) {
  const { toast } = useData()
  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState('')
  const [armed, setArmed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = finalize(d)
    if ('error' in res) {
      setError(res.error)
      return
    }
    await saveRecord(res.record)
    toast('保存しました')
    onSaved(res.record.date)
    onClose()
  }

  const remove = async () => {
    if (!armed) {
      setArmed(true)
      return
    }
    await deleteRecord(d.id!)
    toast('削除しました')
    onClose()
  }

  const title = (d.kind === 'exercise' ? '運動の記録' : '痛みの記録') + (d.id ? '（編集）' : '')

  return (
    <div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-in">
        <header className="top">
          <button type="button" className="iconbtn" aria-label="閉じる" onClick={onClose}>×</button>
          <h1>{title}</h1>
        </header>
        <form className="section form" onSubmit={save} noValidate>
          {d.kind === 'exercise' ? (
            <ExerciseFields d={d} set={(x) => { setD(x); setError('') }} onSwitch={onSwitch} scrollRef={ref} />
          ) : (
            <PainFields d={d} set={(x) => { setD(x); setError('') }} />
          )}
          {error && <p className="err" role="alert">{error}</p>}
          <div className="savebar">
            {d.id && (
              <button type="button" className="btn danger" onClick={remove}>
                {armed ? 'もう一度押すと削除' : '削除'}
              </button>
            )}
            <button type="submit" className="btn primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PainFields({ d, set }: { d: PainDraft; set: (d: PainDraft) => void }) {
  return (
    <>
      <div className="card">
        <div className="field">
          <label htmlFor="f-date">日付</label>
          <input className="inp" type="date" id="f-date" value={d.date} onChange={(e) => set({ ...d, date: e.target.value })} />
        </div>
        <div className="field">
          <span className="lbl">タイミング</span>
          <div className="quick">
            {TIMINGS.map((t) => (
              <button type="button" key={t.id} aria-pressed={d.timing === t.id} onClick={() => set({ ...d, timing: t.id })}>{t.name}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <h3>痛み</h3>
        <PainSetEditor idPrefix="pain" moves="daily" value={d.pain} onChange={(pain) => set({ ...d, pain })} />
      </div>
      <div className="card">
        <div className="field">
          <label htmlFor="f-memo">メモ</label>
          <textarea className="inp" id="f-memo" placeholder="例: 階段で少し痛む" value={d.memo} onChange={(e) => set({ ...d, memo: e.target.value })} />
        </div>
      </div>
    </>
  )
}

function ExerciseFields({ d, set, onSwitch, scrollRef }: { d: ExerciseDraft; set: (d: ExerciseDraft) => void; onSwitch: (d: Draft) => void; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const { records, types, settings } = useData()

  const setAct = (i: number, patch: Partial<ActivityDraft>) =>
    set({ ...d, activities: d.activities.map((a, j) => (j === i ? { ...a, ...patch } : a)) })

  const combos = useMemo(() => (d.id ? null : frequentCombos(records)), [d.id, records])
  const comboList = useMemo(() => {
    if (!combos) return []
    const label = (acts: Activity[]) => acts.map((a) => `${activityShort(a, types)} ${a.minutes}分`).join('→')
    const list: { label: string; acts: Activity[] }[] = []
    if (combos.last) list.push({ label: `前回と同じ（${label(combos.last)}）`, acts: combos.last })
    for (const acts of combos.frequent) {
      const l = label(acts)
      if (!list.some((x) => x.label.includes(l) && x.acts.length === acts.length)) list.push({ label: l, acts })
    }
    return list
  }, [combos, types])

  const sameDay = useMemo(
    () => records.filter((r): r is ExerciseRecord => r.kind === 'exercise' && r.date === d.date && r.id !== d.id),
    [records, d.date, d.id],
  )
  const otherNames = useMemo(
    () => [...new Set(records.flatMap((r) => (r.kind === 'exercise' ? r.activities.filter((a) => a.typeId === OTHER_TYPE_ID && a.otherName).map((a) => a.otherName!) : [])))],
    [records],
  )

  const applyCombo = (acts: Activity[]) => {
    set({ ...d, activities: acts.map((a) => ({ ...newActivity(), typeId: a.typeId, otherName: a.otherName ?? '', minutes: a.minutes })) })
  }

  const appendToPrevious = () => {
    const prev = [...sameDay].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.createdAt.localeCompare(b.createdAt)).at(-1)!
    const draft = toDraft(prev) as ExerciseDraft
    draft.activities.push(newActivity())
    onSwitch(draft)
  }

  const addActivity = () => {
    set({ ...d, activities: [...d.activities, newActivity()] })
    requestAnimationFrame(() => scrollRef.current?.scrollBy({ top: 320, behavior: 'smooth' }))
  }

  return (
    <>
      {comboList.length > 0 && (
        <div className="card">
          <div className="field">
            <span className="lbl">よく使う組み合わせ（タップで運動欄に入ります）</span>
            <div className="quick">
              {comboList.map((c, i) => (
                <button type="button" key={i} onClick={() => applyCombo(c.acts)}>{c.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!d.id && sameDay.length > 0 && (
        <div className="hint">
          この日は運動記録がすでに {sameDay.length} 件あります（{sameDay.map((r) => r.activities.map((a) => activityName(a, types)).join('→')).join('、')}）。
          このまま保存すると<b>{sameDay.length + 1}件目の記録</b>になります。続けて行った運動なら、前の記録に追加してください。
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn small" onClick={appendToPrevious}>前の記録に続けて追加する</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="two">
          <div className="field">
            <label htmlFor="f-date">日付</label>
            <input className="inp" type="date" id="f-date" value={d.date} onChange={(e) => set({ ...d, date: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="f-time">開始時刻（任意）</label>
            <input className="inp" type="time" id="f-time" value={d.startTime} onChange={(e) => set({ ...d, startTime: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3><span className="step">運動前</span>運動前の痛み</h3>
        <PainSetEditor idPrefix="before" moves="daily" value={d.before} onChange={(before) => set({ ...d, before })} />
      </div>

      {d.activities.map((a, i) => (
        <ActivityCard
          key={i}
          i={i}
          a={a}
          count={d.activities.length}
          excludeId={d.id ?? undefined}
          otherNames={otherNames}
          onChange={(patch) => setAct(i, patch)}
          onRemove={() => set({ ...d, activities: d.activities.filter((_, j) => j !== i) })}
        />
      ))}

      <button type="button" className="add" onClick={addActivity}>＋ 続けて別の運動を追加</button>
      <div className="hint">
        <b>続けて追加</b>＝休憩 {settings.gapMin} 分未満で次の運動をしたとき。<br />
        {settings.gapMin} 分以上空いた・一度帰宅した場合は、この記録を保存してから、カレンダーの「＋ 運動を記録」でもう1件作ってください（開始時刻は空欄で大丈夫です）。
      </div>

      <div className="card">
        <h3><span className="step">運動後</span>運動後の痛み</h3>
        <PainSetEditor idPrefix="after" moves="daily" value={d.after} onChange={(after) => set({ ...d, after })} />
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="f-memo">メモ</label>
          <textarea className="inp" id="f-memo" placeholder="例: ジャンプの着地で鼠径部に引っかかり" value={d.memo} onChange={(e) => set({ ...d, memo: e.target.value })} />
        </div>
      </div>
    </>
  )
}

function ActivityCard({ i, a, count, excludeId, otherNames, onChange, onRemove }: {
  i: number
  a: ActivityDraft
  count: number
  excludeId?: string
  otherNames: string[]
  onChange: (patch: Partial<ActivityDraft>) => void
  onRemove: () => void
}) {
  const { records, idx, types } = useData()
  const hist = useMemo(
    () => (a.typeId ? typeHistory(records, idx, { typeId: a.typeId, otherName: a.otherName }, excludeId) : null),
    [records, idx, a.typeId, a.otherName, excludeId],
  )
  const typeName = a.typeId ? activityName(a, types) : '種類を選んでください'
  const intensity = INTENSITIES.find((t) => t.id === a.intensity) ?? INTENSITIES[2]

  return (
    <>
      {i > 0 && <div className="connector">↓ 続けて</div>}
      <div className="card act">
        <h3>
          <span className="step">運動 {i + 1}</span>
          {typeName}
          {count > 1 && <button type="button" className="x" style={{ marginLeft: 'auto' }} aria-label="この運動を削除" onClick={onRemove}>×</button>}
        </h3>
        <div className="two">
          <div className="field">
            <label htmlFor={`type-${i}`}>種類</label>
            <select
              className="inp"
              id={`type-${i}`}
              value={a.typeId}
              onChange={(e) => {
                const t = types.find((x) => x.id === e.target.value)
                onChange({ typeId: e.target.value, minutes: a.minutes ?? t?.defaultMinutes ?? null })
              }}
            >
              <option value="" disabled>選択してください</option>
              {types.filter((t) => !t.hidden || t.id === a.typeId).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`min-${i}`}>運動時間（分）</label>
            <input
              className="inp num"
              type="number"
              inputMode="numeric"
              min={1}
              id={`min-${i}`}
              placeholder="例: 55"
              value={a.minutes ?? ''}
              onChange={(e) => onChange({ minutes: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
        {a.typeId === OTHER_TYPE_ID && (
          <div className="field">
            <label htmlFor={`other-${i}`}>運動の名前</label>
            <input className="inp" id={`other-${i}`} list="other-names" placeholder="例: ピラティス" value={a.otherName} onChange={(e) => onChange({ otherName: e.target.value })} />
            <datalist id="other-names">{otherNames.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
        )}
        <div className="quick">
          {QUICK_MINUTES.map((m) => (
            <button type="button" key={m} aria-pressed={a.minutes === m} onClick={() => onChange({ minutes: m })}>{m}分</button>
          ))}
        </div>
        {hist && hist.n > 0 && (
          <div className="hist">
            これまでの平均（{hist.n}回）　運動中 <b>{f1(hist.during)}</b>　運動後 <b>{f1(hist.after)}</b>　翌日 <b>{f1(hist.next)}</b>
          </div>
        )}
        <div className="field">
          <span className="lbl">強度</span>
          <div className="intens" role="group" aria-label="強度">
            {INTENSITIES.map((t) => (
              <button type="button" key={t.id} aria-pressed={a.intensity === t.id} onClick={() => onChange({ intensity: t.id })}>
                <b>{t.id}</b><span>{t.name}</span>
              </button>
            ))}
          </div>
          <span className="small muted">目安: {intensity.hint}</span>
        </div>
        <div className="lbl">運動中の痛み</div>
        <PainSetEditor idPrefix={`act-${i}`} moves="exercise" value={a.during} onChange={(during) => onChange({ during })} />
      </div>
    </>
  )
}
