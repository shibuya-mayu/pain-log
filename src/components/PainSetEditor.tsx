import { saveSettings } from '../lib/db'
import { SIDES } from '../lib/defaults'
import type { DraftPainSet } from '../lib/drafts'
import { useData } from '../lib/data'
import { levelClass } from '../lib/pain'
import type { Side } from '../lib/types'

interface Props {
  value: DraftPainSet
  onChange: (v: DraftPainSet) => void
  idPrefix: string
  /** 行ごとに「痛んだ動き」を選べるようにする。運動中は exercise、それ以外は daily の候補を出す */
  moves?: 'exercise' | 'daily'
}

export function PainSetEditor({ value, onChange, idPrefix, moves }: Props) {
  const { parts, settings } = useData()
  const moveList = moves === 'exercise' ? settings.moves : moves === 'daily' ? settings.dailyMoves : []
  const visibleParts = parts.filter((p) => !p.hidden)

  const update = (i: number, patch: Partial<DraftPainSet['items'][number]>) =>
    onChange({ ...value, items: value.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })

  const add = () => {
    const prev = value.items.at(-1)
    onChange({
      ...value,
      items: [...value.items, { partId: prev?.partId ?? visibleParts[0]?.id ?? 'other', side: prev?.side ?? settings.lastSide, level: null }],
    })
  }

  return (
    <div className="field">
      <div className="row">
        <button type="button" className="toggle" aria-pressed={value.none} onClick={() => onChange({ ...value, none: !value.none })}>
          痛みなし
        </button>
        <span className="small muted">
          {value.none ? '0 として記録します' : value.items.length ? '' : '未記入のままでも保存できます'}
        </span>
      </div>
      {!value.none && (
        <>
          {value.items.map((it, i) => (
            <div className="painrow" key={i}>
              <div className="painrow-h">
                <select
                  className="inp"
                  id={`${idPrefix}-part-${i}`}
                  aria-label="部位"
                  value={it.partId}
                  onChange={(e) => update(i, { partId: e.target.value })}
                >
                  {parts
                    .filter((p) => !p.hidden || p.id === it.partId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <span className="seg" role="group" aria-label="左右">
                  {(Object.entries(SIDES) as [Side, string][]).map(([k, v]) => (
                    <button
                      type="button"
                      key={k}
                      aria-pressed={it.side === k}
                      onClick={() => {
                        update(i, { side: k })
                        void saveSettings({ lastSide: k })
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </span>
                <button type="button" className="x" aria-label="この痛みを削除" onClick={() => onChange({ ...value, items: value.items.filter((_, j) => j !== i) })}>
                  ×
                </button>
              </div>
              <div className="scale" role="group" aria-label="痛みの程度">
                {Array.from({ length: 11 }, (_, v) => (
                  <button type="button" key={v} aria-pressed={it.level === v} className={it.level === v ? levelClass(v) : ''} onClick={() => update(i, { level: v })}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="scale-cap"><span>0 なし</span><span>1–3 軽い</span><span>4–6 中くらい</span><span>7–10 強い</span></div>
              {moveList.length > 0 && (
                <div className="field">
                  <span className="lbl">この痛みが出た動き（あれば・複数可）</span>
                  <div className="quick" role="group" aria-label="痛んだ動き">
                    {moveList.map((m) => {
                      const on = it.moves?.includes(m) ?? false
                      return (
                        <button type="button" key={m} aria-pressed={on} onClick={() => update(i, { moves: on ? it.moves!.filter((x) => x !== m) : [...(it.moves ?? []), m] })}>
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {settings.useTags && settings.tags.length > 0 && (
                <div className="quick" role="group" aria-label="痛みの種類">
                  {settings.tags.map((t) => {
                    const on = it.tags?.includes(t) ?? false
                    return (
                      <button type="button" key={t} aria-pressed={on} onClick={() => update(i, { tags: on ? it.tags!.filter((x) => x !== t) : [...(it.tags ?? []), t] })}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          <button type="button" className="add" onClick={add}>＋ 痛みを追加（部位・程度）</button>
        </>
      )}
    </div>
  )
}
