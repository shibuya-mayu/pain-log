import { addDays, mondayOf } from './date'
import { OTHER_TYPE_ID } from './defaults'
import { avg, setLevel } from './pain'
import type { Activity, ExerciseRecord, ExerciseType, Intensity, LogRecord, PainSet, Settings } from './types'

export type ByDate = Map<string, LogRecord[]>

export function indexByDate(records: LogRecord[]): ByDate {
  const m: ByDate = new Map()
  for (const r of records) {
    const list = m.get(r.date)
    if (list) list.push(r)
    else m.set(r.date, [r])
  }
  return m
}

export const setsOf = (r: LogRecord): PainSet[] =>
  r.kind === 'pain' ? [r.pain] : [r.before, ...r.activities.map((a) => a.during), r.after]

const levelsOn = (idx: ByDate, ds: string, part?: string | null) =>
  (idx.get(ds) ?? [])
    .flatMap(setsOf)
    .map((s) => setLevel(s, part))
    .filter((v): v is number => v != null)

/** その日の痛みの最大値（記録がなければ null） */
export function dayMax(idx: ByDate, ds: string, part?: string | null) {
  const ls = levelsOn(idx, ds, part)
  return ls.length ? Math.max(...ls) : null
}

/** その日の痛みの平均（タイミングごとの代表値の平均） */
export function dayAvg(idx: ByDate, ds: string, part?: string | null) {
  return avg(levelsOn(idx, ds, part))
}

/** 翌日の痛み: 翌日の起床時の記録。なければ翌日の最大値 */
export function nextDayValue(idx: ByDate, ds: string, part?: string | null) {
  const nd = addDays(ds, 1)
  const recs = idx.get(nd) ?? []
  const wake = recs.find((x) => x.kind === 'pain' && x.timing === 'wake')
  if (wake && wake.kind === 'pain') {
    const v = setLevel(wake.pain, part)
    if (v != null) return v
  }
  return dayMax(idx, nd, part)
}

export const activityKey = (a: Activity) =>
  a.typeId === OTHER_TYPE_ID ? `${OTHER_TYPE_ID}:${a.otherName || 'その他'}` : a.typeId

export function activityName(a: Pick<Activity, 'typeId' | 'otherName'>, types: ExerciseType[]) {
  if (a.typeId === OTHER_TYPE_ID) return a.otherName || 'その他'
  return types.find((t) => t.id === a.typeId)?.name ?? '（削除された種類）'
}

export function activityShort(a: Pick<Activity, 'typeId' | 'otherName'>, types: ExerciseType[]) {
  if (a.typeId === OTHER_TYPE_ID) return (a.otherName || '他').slice(0, 2)
  return types.find((t) => t.id === a.typeId)?.short ?? '?'
}

/** 強度のグラフ用グループ */
export function intensityGroups(view: Settings['intView']) {
  return view === '5'
    ? ([1, 2, 3, 4, 5] as const).map((n) => ({ id: String(n), levels: [n] as Intensity[] }))
    : [
        { id: 'L', levels: [1, 2] as Intensity[] },
        { id: 'M', levels: [3] as Intensity[] },
        { id: 'H', levels: [4, 5] as Intensity[] },
      ]
}
export const groupOf = (lv: Intensity, view: Settings['intView']) =>
  view === '5' ? String(lv) : lv <= 2 ? 'L' : lv === 3 ? 'M' : 'H'

export interface TypeStat {
  key: string
  name: string
  n: number
  during: number | null
  after: number | null
  next: number | null
  byIntensity: Record<string, { n: number; after: number | null; next: number | null }>
}

export interface Stats {
  types: TypeStat[]
  /** 痛んだ動き: 記録された回数、そのときの痛みの平均、部位ごとの回数 */
  moves: { name: string; n: number; avg: number | null; parts: { id: string; n: number }[] }[]
  days: { ds: string; v: number | null; acts: string[]; minutes: number }[]
  weeks: { week: string; minutes: number; avg: number | null }[]
  parts: { id: string; days: number; avg: number | null }[]
  consecutive: { n: number; avg: number | null }
  spaced: { n: number; avg: number | null }
  exerciseCount: number
  avgPain: number | null
  highDays: number
}

export interface StatsOptions {
  from: string
  to: string
  part?: string | null
  intView: Settings['intView']
  types: ExerciseType[]
}

export function computeStats(records: LogRecord[], idx: ByDate, o: StatsOptions): Stats {
  const part = o.part || null
  const inRange = records.filter((r) => r.date >= o.from && r.date <= o.to)
  const exercises = inRange.filter((r): r is ExerciseRecord => r.kind === 'exercise')

  const by = new Map<string, { name: string; n: number; d: number[]; a: number[]; x: number[]; int: Map<string, { n: number; a: number[]; x: number[] }> }>()
  const mv = new Map<string, { n: number; d: number[]; parts: Map<string, number> }>()

  for (const r of exercises) {
    const after = setLevel(r.after, part)
    const next = nextDayValue(idx, r.date, part)
    for (const a of r.activities) {
      const k = activityKey(a)
      let t = by.get(k)
      if (!t) by.set(k, (t = { name: activityName(a, o.types), n: 0, d: [], a: [], x: [], int: new Map() }))
      t.n++
      const dv = setLevel(a.during, part)
      if (dv != null) t.d.push(dv)
      if (after != null) t.a.push(after)
      if (next != null) t.x.push(next)
      const g = groupOf(a.intensity ?? 3, o.intView)
      let gi = t.int.get(g)
      if (!gi) t.int.set(g, (gi = { n: 0, a: [], x: [] }))
      gi.n++
      if (after != null) gi.a.push(after)
      if (next != null) gi.x.push(next)
      if (!a.during.none) {
        for (const item of a.during.items) {
          if (part && item.partId !== part) continue
          for (const m of item.moves ?? []) {
            let q = mv.get(m)
            if (!q) mv.set(m, (q = { n: 0, d: [], parts: new Map() }))
            q.n++
            q.d.push(item.level)
            q.parts.set(item.partId, (q.parts.get(item.partId) ?? 0) + 1)
          }
        }
      }
    }
  }

  const types: TypeStat[] = [...by.entries()]
    .map(([key, t]) => ({
      key,
      name: t.name,
      n: t.n,
      during: avg(t.d),
      after: avg(t.a),
      next: avg(t.x),
      byIntensity: Object.fromEntries([...t.int.entries()].map(([g, v]) => [g, { n: v.n, after: avg(v.a), next: avg(v.x) }])),
    }))
    .sort((a, b) => b.n - a.n)

  const moves = [...mv.entries()]
    .map(([name, q]) => ({ name, n: q.n, avg: avg(q.d), parts: [...q.parts.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n) }))
    .sort((a, b) => b.n - a.n)

  // 日ごと: 最初の記録日より前は含めない
  const firstDate = records.reduce((m, r) => (r.date < m ? r.date : m), o.to)
  const start = o.from < firstDate ? firstDate : o.from
  const days: Stats['days'] = []
  for (let ds = start; ds <= o.to; ds = addDays(ds, 1)) {
    const ex = (idx.get(ds) ?? []).filter((r): r is ExerciseRecord => r.kind === 'exercise')
    days.push({
      ds,
      v: dayMax(idx, ds, part),
      acts: ex.flatMap((r) => r.activities.map((a) => activityName(a, o.types))),
      minutes: ex.reduce((s, r) => s + r.activities.reduce((t, a) => t + (a.minutes || 0), 0), 0),
    })
  }

  const wk = new Map<string, { minutes: number; vals: number[] }>()
  for (const d of days) {
    const k = mondayOf(d.ds)
    let w = wk.get(k)
    if (!w) wk.set(k, (w = { minutes: 0, vals: [] }))
    w.minutes += d.minutes
    if (d.v != null) w.vals.push(d.v)
  }
  const weeks = [...wk.entries()].map(([week, w]) => ({ week, minutes: w.minutes, avg: avg(w.vals) }))

  // 連日運動 / 間を空けた: 運動した日の翌日の痛み
  const exDays = new Set(records.filter((r) => r.kind === 'exercise').map((r) => r.date))
  const cons: number[] = []
  const spaced: number[] = []
  for (const ds of exDays) {
    if (ds < o.from || ds >= o.to) continue
    const nv = nextDayValue(idx, ds, part)
    if (nv == null) continue
    ;(exDays.has(addDays(ds, -1)) ? cons : spaced).push(nv)
  }

  const partMap = new Map<string, { dates: Set<string>; levels: number[] }>()
  for (const r of inRange) {
    for (const s of setsOf(r)) {
      if (s.none) continue
      for (const i of s.items) {
        if (i.level <= 0) continue
        let p = partMap.get(i.partId)
        if (!p) partMap.set(i.partId, (p = { dates: new Set(), levels: [] }))
        p.dates.add(r.date)
        p.levels.push(i.level)
      }
    }
  }
  const parts = [...partMap.entries()]
    .map(([id, p]) => ({ id, days: p.dates.size, avg: avg(p.levels) }))
    .sort((a, b) => b.days - a.days)

  const vals = days.map((d) => d.v).filter((v): v is number => v != null)
  return {
    types,
    moves,
    days,
    weeks,
    parts,
    consecutive: { n: cons.length, avg: avg(cons) },
    spaced: { n: spaced.length, avg: avg(spaced) },
    exerciseCount: exercises.reduce((s, r) => s + r.activities.length, 0),
    avgPain: avg(vals),
    highDays: vals.filter((v) => v >= 7).length,
  }
}

/** 入力画面に出す「これまでの平均」 */
export function typeHistory(records: LogRecord[], idx: ByDate, a: Pick<Activity, 'typeId' | 'otherName'>, excludeId?: string) {
  const d: number[] = []
  const af: number[] = []
  const x: number[] = []
  let n = 0
  for (const r of records) {
    if (r.kind !== 'exercise' || r.id === excludeId) continue
    for (const b of r.activities) {
      if (b.typeId !== a.typeId) continue
      if (a.typeId === OTHER_TYPE_ID && (b.otherName || '') !== (a.otherName || '')) continue
      n++
      const dv = setLevel(b.during)
      if (dv != null) d.push(dv)
      const av = setLevel(r.after)
      if (av != null) af.push(av)
      const nv = nextDayValue(idx, r.date)
      if (nv != null) x.push(nv)
    }
  }
  return { n, during: avg(d), after: avg(af), next: avg(x) }
}

/** 「前回と同じ」＋よく使う組み合わせ（最大 4） */
export function frequentCombos(records: LogRecord[]) {
  const ex = records
    .filter((r): r is ExerciseRecord => r.kind === 'exercise')
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  const cnt = new Map<string, { n: number; acts: Activity[] }>()
  for (const r of ex) {
    const key = r.activities.map((a) => `${activityKey(a)}|${a.minutes}`).join('>')
    const c = cnt.get(key)
    if (c) c.n++
    else cnt.set(key, { n: 1, acts: r.activities })
  }
  const frequent = [...cnt.values()].sort((a, b) => b.n - a.n).slice(0, 4).map((c) => c.acts)
  return { last: ex.at(-1)?.activities ?? null, frequent }
}
