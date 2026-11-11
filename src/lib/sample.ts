// 開発用のサンプルデータ（公開版には含まれない）
import { addDays, parse, today } from './date'
import { newId } from './db'
import type { Activity, Intensity, LogRecord, PainSet } from './types'

export function makeSample(): LogRecord[] {
  let seed = 11
  const r = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const clamp = (v: number) => Math.max(0, Math.min(10, Math.round(v)))
  const prof: Record<string, number[]> = { bodyattack: [4, 5, 4], bodycombat: [3, 4, 3], bodypump: [2, 3, 2], bodystep: [3, 4, 3], yoga: [1, 1, 1], pool: [0, 1, 1], running: [4, 5, 4], tabletennis: [2, 3, 2], hiking: [3, 5, 5] }
  const mins: Record<string, number> = { bodyattack: 55, bodycombat: 55, bodypump: 60, bodystep: 55, yoga: 45, pool: 30, running: 30, tabletennis: 60, hiking: 180 }
  const MV: Record<string, string[]> = { bodyattack: ['ジャンプ', 'ランジ'], bodycombat: ['キック', 'ひねり'], bodypump: ['スクワット', 'ランジ'], bodystep: ['ステップ昇降', 'ランジ'], tabletennis: ['切り返し'], running: ['着地'], hiking: ['下り坂', 'ステップ昇降'], yoga: ['開脚', '片脚立ち'], pool: ['キック'] }
  const DAILY = ['歩き始め', '寝返り', '立ち上がる', '歩いている時', '階段を下りる']
  const pick = ['bodyattack', 'bodyattack', 'bodycombat', 'bodycombat', 'bodypump', 'bodypump', 'bodystep', 'yoga', 'yoga', 'pool', 'running', 'tabletennis', 'hiking']
  const MOD: Record<Intensity, number> = { 1: -2, 2: -1, 3: 0, 4: 0.7, 5: 1.3 }
  const j = () => Math.round((r() - 0.5) * 2.4)
  const part = () => { const x = r(); return x < 0.62 ? 'groin' : x < 0.8 ? 'hip-side' : x < 0.92 ? 'buttock' : 'thigh-front' }
  const mk = (lv: number): PainSet => lv <= 0 ? { none: true, items: [] } : {
    none: false,
    items: [{ partId: part(), side: 'R' as const, level: clamp(lv) }, ...(lv >= 5 && r() < 0.35 ? [{ partId: 'buttock', side: 'R' as const, level: clamp(lv - 2) }] : [])],
  }
  const ts = new Date().toISOString()
  const recs: LogRecord[] = []
  const end = today()
  let carry: number | null = null
  for (let ds = addDays(end, -90); ds <= end; ds = addDays(ds, 1)) {
    const dow = parse(ds).getDay()
    const base = carry ?? Math.round(r() * 2)
    if (carry != null || r() < 0.45) {
      const wake = mk(base)
      if (!wake.none && wake.items[0].level >= 2 && r() < 0.6) wake.items[0].moves = [DAILY[Math.floor(r() * DAILY.length)]]
      recs.push({ id: newId(), kind: 'pain', date: ds, timing: 'wake', pain: wake, createdAt: ts, updatedAt: ts })
    }
    carry = null
    if (ds === end) break
    if (r() < (dow === 0 || dow === 6 ? 0.75 : 0.5)) {
      const t1 = pick[Math.floor(r() * pick.length)]
      const tsx = [t1]
      if (['bodyattack', 'bodycombat', 'bodystep'].includes(t1) && r() < 0.35) tsx.push(r() < 0.5 ? 'bodypump' : 'yoga')
      const acts: (Activity & { m: number })[] = tsx.map((t) => {
        const x = r()
        const it: Intensity = x < 0.12 ? 1 : x < 0.3 ? 2 : x < 0.6 ? 3 : x < 0.85 ? 4 : 5
        const dl = prof[t][0] + MOD[it] + j()
        let mv = dl >= 3 ? MV[t].filter(() => r() < 0.6) : []
        if (dl >= 3 && !mv.length) mv = [MV[t][0]]
        const during = mk(dl)
        if (mv.length && during.items[0]) during.items[0].moves = mv
        return { typeId: t, minutes: mins[t], intensity: it, during, m: MOD[it] }
      })
      const after = Math.max(...acts.map((a) => prof[a.typeId][1] + a.m)) + j()
      carry = Math.max(...acts.map((a) => prof[a.typeId][2] + a.m)) + j()
      recs.push({
        id: newId(), kind: 'exercise', date: ds, startTime: dow === 0 || dow === 6 ? '10:30' : '19:15',
        before: mk(base + (r() < 0.3 ? 1 : 0)), activities: acts.map(({ m: _m, ...a }) => a), after: mk(after),
        memo: tsx.includes('bodyattack') && r() < 0.4 ? 'ジャンプ系の後半で鼠径部に引っかかり' : undefined, createdAt: ts, updatedAt: ts,
      })
    }
  }
  return recs
}
