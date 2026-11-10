import { INTENSITIES, SIDES, TIMINGS } from '../lib/defaults'
import { jpDate } from '../lib/date'
import { newExercise, newPain, toDraft, type Draft } from '../lib/drafts'
import { useData } from '../lib/data'
import { levelClass } from '../lib/pain'
import { activityName, activityShort } from '../lib/stats'
import type { LogRecord, PainSet } from '../lib/types'

const timingOrder = { wake: 0, day: 1, night: 3, other: 2 }
const sortKey = (r: LogRecord) =>
  r.kind === 'pain' ? `${timingOrder[r.timing]}${r.timing === 'wake' ? '00:00' : '99:99'}` : `1${r.startTime ?? '50:00'}`

export function DayPanel({ ds, onOpen }: { ds: string; onOpen: (d: Draft) => void }) {
  const { idx, types, parts } = useData()
  const recs = [...(idx.get(ds) ?? [])].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.createdAt.localeCompare(b.createdAt))

  const PainText = ({ set }: { set: PainSet }) => {
    if (set.none) return <><span className="lvpill lv0 num">0</span>痛みなし</>
    if (!set.items.length) return <span className="muted">未記入</span>
    return (
      <>
        {set.items.map((i, k) => (
          <span key={k}>
            {k > 0 && '　'}
            <span className={`lvpill num ${levelClass(i.level)}`}>{i.level}</span>
            {parts.find((p) => p.id === i.partId)?.name ?? '?'}（{SIDES[i.side]}）{i.moves?.length ? `［${i.moves.join('・')}で］` : ''}{i.tags?.length ? `・${i.tags.join('・')}` : ''}
          </span>
        ))}
      </>
    )
  }

  return (
    <section className="panel" aria-label={`${jpDate(ds)}の記録`}>
      <h2>{jpDate(ds)}</h2>
      {recs.length === 0 && <p className="muted small" style={{ margin: 0 }}>この日の記録はまだありません。</p>}
      {recs.map((r) =>
        r.kind === 'exercise' ? (
          <div className="rec" key={r.id}>
            <div className="rec-h">
              <span className="kind">運動</span>
              <strong>{r.activities.map((a) => `${activityName(a, types)} ${a.minutes}分`).join(' → ')}</strong>
              <button className="btn small" onClick={() => onOpen(toDraft(r))}>編集</button>
            </div>
            <dl>
              {r.startTime && <><dt>開始</dt><dd className="num">{r.startTime}</dd></>}
              <dt>運動前</dt><dd><PainText set={r.before} /></dd>
              {r.activities.map((a, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <dt>{activityShort(a, types)} 中</dt>
                  <dd>
                    <PainText set={a.during} />{' '}
                    <span className="muted">
                      ［強度{a.intensity} {INTENSITIES.find((t) => t.id === a.intensity)?.name}］
                    </span>
                  </dd>
                </div>
              ))}
              <dt>運動後</dt><dd><PainText set={r.after} /></dd>
              {r.memo && <><dt>メモ</dt><dd>{r.memo}</dd></>}
            </dl>
          </div>
        ) : (
          <div className="rec" key={r.id}>
            <div className="rec-h">
              <span className="kind p">痛み</span>
              <strong>{TIMINGS.find((t) => t.id === r.timing)?.name}</strong>
              <button className="btn small" onClick={() => onOpen(toDraft(r))}>編集</button>
            </div>
            <dl>
              <dt>痛み</dt><dd><PainText set={r.pain} /></dd>
              {r.memo && <><dt>メモ</dt><dd>{r.memo}</dd></>}
            </dl>
          </div>
        ),
      )}
      <div className="row">
        <button className="btn primary" onClick={() => onOpen(newExercise(ds))}>＋ 運動を記録</button>
        <button className="btn" onClick={() => onOpen(newPain(ds))}>＋ 痛みだけ記録</button>
      </div>
    </section>
  )
}
