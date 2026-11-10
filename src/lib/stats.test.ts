import { describe, expect, it } from 'vitest'
import { emptySet, setLevel } from './pain'
import { computeStats, dayAvg, dayMax, indexByDate, nextDayValue } from './stats'
import { DEFAULT_TYPES } from './defaults'
import type { ExerciseRecord, LogRecord, PainRecord, PainSet } from './types'

const p = (...levels: ([string, number] | [string, number, string[]])[]): PainSet => ({ none: false, items: levels.map(([partId, level, moves]) => ({ partId, side: 'R', level, moves })) })
const none: PainSet = { none: true, items: [] }
const ts = '2026-01-01T00:00:00Z'
const ex = (id: string, date: string, o: Partial<ExerciseRecord> = {}): ExerciseRecord => ({
  id, kind: 'exercise', date, before: emptySet(), after: emptySet(), createdAt: ts, updatedAt: ts,
  activities: [{ typeId: 'bodyattack', minutes: 55, intensity: 3, during: emptySet() }], ...o,
})
const pain = (id: string, date: string, set: PainSet, timing: PainRecord['timing'] = 'wake'): PainRecord => ({
  id, kind: 'pain', date, timing, pain: set, createdAt: ts, updatedAt: ts,
})

describe('setLevel', () => {
  it('未記入は null、痛みなしは 0、それ以外は最大値', () => {
    expect(setLevel(emptySet())).toBeNull()
    expect(setLevel(none)).toBe(0)
    expect(setLevel(p(['groin', 3], ['buttock', 6]))).toBe(6)
  })
  it('部位指定: 他の部位だけ痛いときは 0', () => {
    expect(setLevel(p(['groin', 3], ['buttock', 6]), 'groin')).toBe(3)
    expect(setLevel(p(['buttock', 6]), 'groin')).toBe(0)
    expect(setLevel(emptySet(), 'groin')).toBeNull()
  })
})

describe('day values', () => {
  const recs: LogRecord[] = [
    pain('a', '2026-03-01', p(['groin', 1])),
    ex('b', '2026-03-01', { before: none, after: p(['groin', 5]), activities: [{ typeId: 'bodyattack', minutes: 55, intensity: 4, during: p(['groin', 7, ['ジャンプ']]) }] }),
  ]
  const idx = indexByDate(recs)
  it('最大値は 7、平均は未記入を除外', () => {
    expect(dayMax(idx, '2026-03-01')).toBe(7)
    // 1, 0(前), 7(中), 5(後)
    expect(dayAvg(idx, '2026-03-01')).toBeCloseTo(13 / 4)
    expect(dayMax(idx, '2026-03-02')).toBeNull()
  })
  it('翌日の値は起床時を優先', () => {
    const idx2 = indexByDate([...recs, pain('c', '2026-03-02', p(['groin', 2])), pain('d', '2026-03-02', p(['groin', 6]), 'night')])
    expect(nextDayValue(idx2, '2026-03-01')).toBe(2)
    const idx3 = indexByDate([...recs, pain('d', '2026-03-02', p(['groin', 6]), 'night')])
    expect(nextDayValue(idx3, '2026-03-01')).toBe(6)
  })
})

describe('computeStats', () => {
  const recs: LogRecord[] = [
    ex('1', '2026-03-02', { after: p(['groin', 4]), activities: [
      { typeId: 'bodyattack', minutes: 55, intensity: 5, during: p(['groin', 6, ['ジャンプ']], ['buttock', 3, ['ジャンプ', 'ランジ']]) },
      { typeId: 'bodypump', minutes: 60, intensity: 2, during: none },
    ] }),
    pain('2', '2026-03-03', p(['groin', 3])),
    ex('3', '2026-03-03', { after: p(['groin', 2]), activities: [{ typeId: 'bodyattack', minutes: 55, intensity: 1, during: p(['groin', 2]) }] }),
    pain('4', '2026-03-04', none),
    ex('5', '2026-03-06', { after: emptySet() }),
  ]
  const idx = indexByDate(recs)
  const s = computeStats(recs, idx, { from: '2026-03-01', to: '2026-03-07', intView: '3', types: DEFAULT_TYPES })

  it('種類別: 運動後は記録内の全種目に計上、未記入は除外', () => {
    const ba = s.types.find((t) => t.key === 'bodyattack')!
    expect(ba.n).toBe(3)
    expect(ba.during).toBeCloseTo((6 + 2) / 2)
    expect(ba.after).toBeCloseTo((4 + 2) / 2)
    expect(ba.next).toBeCloseTo((3 + 0) / 2)
    const bp = s.types.find((t) => t.key === 'bodypump')!
    expect(bp.during).toBe(0)
    expect(bp.after).toBe(4)
  })
  it('強度は 3 グループにまとまる', () => {
    const ba = s.types.find((t) => t.key === 'bodyattack')!
    expect(ba.byIntensity.H).toEqual({ n: 1, after: 4, next: 3 })
    expect(ba.byIntensity.L).toEqual({ n: 1, after: 2, next: 0 })
    expect(ba.byIntensity.M.n).toBe(1)
  })
  it('連日と間隔', () => {
    // 3/2 → 翌日 3（間隔）、3/3 → 翌日 0（連日）、3/6 → 翌日記録なし
    expect(s.consecutive).toEqual({ n: 1, avg: 0 })
    expect(s.spaced).toEqual({ n: 1, avg: 3 })
  })
  it('動き・週・部位', () => {
    expect(s.moves).toEqual([
      { name: 'ジャンプ', n: 2, avg: 4.5, parts: [{ id: 'groin', n: 1 }, { id: 'buttock', n: 1 }] },
      { name: 'ランジ', n: 1, avg: 3, parts: [{ id: 'buttock', n: 1 }] },
    ])
    const g = computeStats(recs, idx, { from: '2026-03-01', to: '2026-03-07', intView: '3', types: DEFAULT_TYPES, part: 'groin' })
    expect(g.moves).toEqual([{ name: 'ジャンプ', n: 1, avg: 6, parts: [{ id: 'groin', n: 1 }] }])
    expect(s.weeks[0]).toMatchObject({ week: '2026-03-02', minutes: 55 + 60 + 55 + 55 })
    expect(s.parts[0]).toMatchObject({ id: 'groin', days: 2 })
    expect(s.days[0].ds).toBe('2026-03-02')
  })
})

describe('手で答え合わせできる例（README の確認手順と同じデータ）', () => {
  const recs: LogRecord[] = [
    ex('a', '2026-11-03', { after: p(['groin', 4]), activities: [{ typeId: 'bodyattack', minutes: 55, intensity: 5, during: p(['groin', 6, ['ジャンプ']]) }] }),
    pain('b', '2026-11-04', p(['groin', 3])),
    ex('c', '2026-11-05', { after: p(['groin', 2]), activities: [{ typeId: 'bodyattack', minutes: 55, intensity: 1, during: p(['groin', 2]) }] }),
    pain('d', '2026-11-06', none),
  ]
  const idx = indexByDate(recs)
  const s = computeStats(recs, idx, { from: '2026-10-12', to: '2026-11-10', intView: '3', types: DEFAULT_TYPES })
  it('カレンダーの数字', () => {
    expect(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map((d) => dayMax(idx, d))).toEqual([6, 3, 2, 0])
  })
  it('グラフの数字', () => {
    expect(s.exerciseCount).toBe(2)
    expect(s.avgPain).toBeCloseTo(2.75)
    expect(s.highDays).toBe(0)
    expect(s.types).toEqual([expect.objectContaining({ name: 'ボディアタック', n: 2, during: 4, after: 3, next: 1.5 })])
    expect(s.types[0].byIntensity).toEqual({ H: { n: 1, after: 4, next: 3 }, L: { n: 1, after: 2, next: 0 } })
    expect(s.moves).toEqual([{ name: 'ジャンプ', n: 1, avg: 6, parts: [{ id: 'groin', n: 1 }] }])
    expect(s.spaced).toEqual({ n: 2, avg: 1.5 })
    expect(s.consecutive).toEqual({ n: 0, avg: null })
    expect(s.parts).toEqual([{ id: 'groin', days: 3, avg: 3.4 }])
  })
})
