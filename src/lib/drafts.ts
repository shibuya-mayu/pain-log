import { newId, nowIso } from './db'
import { OTHER_TYPE_ID } from './defaults'
import type { Activity, ExerciseRecord, Intensity, LogRecord, PainItem, PainRecord, PainSet, Timing } from './types'

/** 入力途中の値。程度・種類・時間は未選択（null / ''）を許す */
export type DraftPainItem = Omit<PainItem, 'level'> & { level: number | null }
export interface DraftPainSet {
  none: boolean
  items: DraftPainItem[]
}
export interface ActivityDraft {
  typeId: string
  otherName: string
  minutes: number | null
  intensity: Intensity
  during: DraftPainSet
}
export interface ExerciseDraft {
  kind: 'exercise'
  id: string | null
  createdAt?: string
  date: string
  startTime: string
  before: DraftPainSet
  activities: ActivityDraft[]
  after: DraftPainSet
  memo: string
}
export interface PainDraft {
  kind: 'pain'
  id: string | null
  createdAt?: string
  date: string
  timing: Timing
  pain: DraftPainSet
  memo: string
}
export type Draft = ExerciseDraft | PainDraft

export const emptyDraftSet = (): DraftPainSet => ({ none: false, items: [] })

export const newActivity = (): ActivityDraft => ({
  typeId: '', otherName: '', minutes: null, intensity: 3, during: emptyDraftSet(),
})

export const newExercise = (date: string): ExerciseDraft => ({
  kind: 'exercise', id: null, date, startTime: '', before: emptyDraftSet(), activities: [newActivity()], after: emptyDraftSet(), memo: '',
})

export const newPain = (date: string): PainDraft => ({
  kind: 'pain', id: null, date, timing: 'wake', pain: emptyDraftSet(), memo: '',
})

const cloneSet = (s: PainSet): DraftPainSet => ({
  none: s.none,
  items: s.items.map((i) => ({ ...i, tags: i.tags ? [...i.tags] : undefined, moves: i.moves ? [...i.moves] : undefined })),
})

export function toDraft(r: LogRecord): Draft {
  if (r.kind === 'pain') {
    return { kind: 'pain', id: r.id, createdAt: r.createdAt, date: r.date, timing: r.timing, pain: cloneSet(r.pain), memo: r.memo ?? '' }
  }
  return {
    kind: 'exercise', id: r.id, createdAt: r.createdAt, date: r.date, startTime: r.startTime ?? '',
    before: cloneSet(r.before), after: cloneSet(r.after), memo: r.memo ?? '',
    activities: r.activities.map((a) => ({
      typeId: a.typeId, otherName: a.otherName ?? '', minutes: a.minutes, intensity: a.intensity ?? 3, during: cloneSet(a.during),
    })),
  }
}

function finalizeSet(s: DraftPainSet, label: string): PainSet | string {
  if (s.none) return { none: true, items: [] }
  if (s.items.some((i) => i.level == null)) return `${label}の痛みの程度（0〜10）を選んでください`
  return { none: false, items: s.items.map((i) => ({ ...i, level: i.level as number, tags: i.tags?.length ? i.tags : undefined, moves: i.moves?.length ? i.moves : undefined })) }
}

/** 保存できる記録に変換する。入力に不足があればエラー文を返す */
export function finalize(d: Draft): { record: LogRecord } | { error: string } {
  if (!d.date) return { error: '日付を入れてください' }
  const now = nowIso()
  const base = { id: d.id ?? newId(), createdAt: d.createdAt ?? now, updatedAt: now, date: d.date, memo: d.memo.trim() || undefined }
  if (d.kind === 'pain') {
    const pain = finalizeSet(d.pain, '')
    if (typeof pain === 'string') return { error: pain }
    const r: PainRecord = { ...base, kind: 'pain', timing: d.timing, pain }
    return { record: r }
  }
  const before = finalizeSet(d.before, '運動前')
  if (typeof before === 'string') return { error: before }
  const after = finalizeSet(d.after, '運動後')
  if (typeof after === 'string') return { error: after }
  const activities: Activity[] = []
  for (const [i, a] of d.activities.entries()) {
    const label = d.activities.length > 1 ? `運動${i + 1}` : '運動'
    if (!a.typeId) return { error: `${label}の種類を選んでください` }
    if (a.typeId === OTHER_TYPE_ID && !a.otherName.trim()) return { error: `${label}の名前を入れてください` }
    if (!a.minutes || a.minutes <= 0) return { error: `${label}の時間（分）を入れてください` }
    const during = finalizeSet(a.during, `${label}中`)
    if (typeof during === 'string') return { error: during }
    activities.push({
      typeId: a.typeId,
      otherName: a.typeId === OTHER_TYPE_ID ? a.otherName.trim() : undefined,
      minutes: a.minutes,
      intensity: a.intensity,
      during,
    })
  }
  if (!activities.length) return { error: '運動を 1 つ以上入れてください' }
  const r: ExerciseRecord = { ...base, kind: 'exercise', startTime: d.startTime || undefined, before, activities, after }
  return { record: r }
}
