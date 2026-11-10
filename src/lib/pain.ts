import type { PainSet } from './types'

export const emptySet = (): PainSet => ({ none: false, items: [] })

/**
 * 痛みセットの代表値。
 * null = 未記入 / 0 = 痛みなし / それ以外 = 最大値。
 * part を指定すると、その部位だけの値（他の部位だけが痛い場合は 0）。
 */
export function setLevel(set: PainSet | undefined, part?: string | null): number | null {
  if (!set) return null
  if (set.none) return 0
  if (!set.items.length) return null
  const items = part ? set.items.filter((i) => i.partId === part) : set.items
  if (!items.length) return 0
  return Math.max(...items.map((i) => i.level))
}

/** 0〜10 を 6 段階の色クラスに */
export const levelClass = (v: number | null) =>
  v == null ? '' : v === 0 ? 'lv0' : v <= 2 ? 'lv1' : v <= 4 ? 'lv2' : v <= 6 ? 'lv3' : v <= 8 ? 'lv4' : 'lv5'

export const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null)

export const f1 = (v: number | null | undefined) => (v == null ? '–' : v.toFixed(1))
