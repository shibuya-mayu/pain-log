export type Side = 'L' | 'R' | 'B'

export interface PainItem {
  partId: string
  side: Side
  level: number // 0〜10
  tags?: string[]
  moves?: string[] // 痛んだ動き（運動中は Settings.moves、それ以外は Settings.dailyMoves から選ぶ）
}

/** none=true → 痛みなし(0)。none=false かつ items が空 → 未記入 */
export interface PainSet {
  none: boolean
  items: PainItem[]
}

export type Intensity = 1 | 2 | 3 | 4 | 5

export interface Activity {
  typeId: string
  otherName?: string
  minutes: number
  intensity: Intensity
  during: PainSet
}

export interface ExerciseRecord {
  id: string
  kind: 'exercise'
  date: string // 'YYYY-MM-DD'
  startTime?: string // 'HH:mm'
  before: PainSet
  activities: Activity[]
  after: PainSet
  memo?: string
  createdAt: string
  updatedAt: string
}

export type Timing = 'wake' | 'day' | 'night' | 'other'

export interface PainRecord {
  id: string
  kind: 'pain'
  date: string
  timing: Timing
  pain: PainSet
  memo?: string
  createdAt: string
  updatedAt: string
}

export type LogRecord = ExerciseRecord | PainRecord

export interface ExerciseType {
  id: string
  name: string
  short: string
  defaultMinutes: number
  order: number
  hidden: boolean
}

export interface BodyPart {
  id: string
  name: string
  order: number
  hidden: boolean
}

export interface Settings {
  calMode: 'max' | 'avg'
  useTags: boolean
  tags: string[]
  moves: string[]
  dailyMoves: string[]
  /** 痛みの程度 0〜10 の目安（添字 = 数値）。利用者が書き換えられる */
  levelGuide: string[]
  intView: '3' | '5'
  gapMin: number
  lastSide: Side
  lastBackupAt?: string
}
