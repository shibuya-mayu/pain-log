import type { BodyPart, ExerciseType, Intensity, Settings, Side, Timing } from './types'

/** 「その他」の運動。入力時に名前を書く */
export const OTHER_TYPE_ID = 'other'

const types: [string, string, string, number][] = [
  ['bodycombat', 'ボディコンバット', 'BC', 55],
  ['bodyattack', 'ボディアタック', 'BA', 55],
  ['bodypump', 'ボディパンプ', 'BP', 60],
  ['bodystep', 'ボディステップ', 'BS', 55],
  ['tabletennis', '卓球', '卓球', 60],
  ['badminton', 'バドミントン', 'バド', 60],
  ['yoga', 'ヨガ', 'ヨガ', 45],
  ['running', 'ランニング', 'ラン', 30],
  ['hiking', '登山', '登山', 180],
  ['pool', 'プール', 'プール', 30],
  [OTHER_TYPE_ID, 'その他', '他', 30],
]
export const DEFAULT_TYPES: ExerciseType[] = types.map(([id, name, short, defaultMinutes], order) => ({
  id, name, short, defaultMinutes, order, hidden: false,
}))

const parts: [string, string][] = [
  ['groin', '股関節 前（鼠径部）'],
  ['hip-side', '股関節 外側'],
  ['buttock', 'お尻'],
  ['thigh-front', '太もも 前'],
  ['thigh-side', '太もも 外側'],
  ['thigh-inner', '太もも 内側'],
  ['back', '腰'],
  ['knee', '膝'],
  ['other', 'その他'],
]
export const DEFAULT_PARTS: BodyPart[] = parts.map(([id, name], order) => ({ id, name, order, hidden: false }))

/** 痛みの程度の目安（初期値）。数値がぶれないよう「できる・できない動き」で書く */
export const DEFAULT_LEVEL_GUIDE = [
  '痛みなし',
  '意識すると分かる程度。動きに影響なし',
  'ときどき気になる。動きに影響なし',
  'ずっと気になるが、いつも通り動ける',
  '動きを少し変えたくなる（かばう・ペースを落とす）',
  'かばって動く。一部の動きを控えたい',
  '休憩したり動きを控えたりしないと続けられない',
  '歩き方が変わる。運動は続けられない',
  '歩くのがつらい。日常の動作にも困る',
  'ほとんど動けない',
  '想像できる中で最も強い痛み',
]

export const DEFAULT_SETTINGS: Settings = {
  calMode: 'max',
  useTags: false,
  tags: ['ズキズキ', '鈍い', '引っかかる', '抜ける感じ', '張り'],
  moves: ['ジャンプ', 'キック', 'ランジ', 'スクワット', '開脚', 'ひねり', '片脚立ち', 'ステップ昇降', '切り返し', '着地', '下り坂'],
  dailyMoves: ['歩いている時', '歩き始め', '小走り', '階段を上る', '階段を下りる', '立ち上がる', '座っている時', '寝返り', '靴下・靴を履く', '車の乗り降り', '長く立っている時'],
  levelGuide: DEFAULT_LEVEL_GUIDE,
  intView: '3',
  gapMin: 30,
  lastSide: 'R',
}

export const SIDES: Record<Side, string> = { L: '左', R: '右', B: '両' }

export const TIMINGS: { id: Timing; name: string }[] = [
  { id: 'wake', name: '起床時' },
  { id: 'day', name: '日中' },
  { id: 'night', name: '就寝前' },
  { id: 'other', name: 'その他' },
]

export const INTENSITIES: { id: Intensity; name: string; hint: string }[] = [
  { id: 1, name: 'かなり抑えめ', hint: 'ローインパクト中心、ジャンプなし' },
  { id: 2, name: '少し抑えめ', hint: '一部の動きだけ控えた' },
  { id: 3, name: 'ふつう', hint: 'いつも通り' },
  { id: 4, name: 'しっかり', hint: 'いつもより頑張った' },
  { id: 5, name: '全力', hint: '限界まで出し切った' },
]

export const QUICK_MINUTES = [30, 45, 55, 60, 90]
