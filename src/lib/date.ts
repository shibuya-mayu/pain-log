const pad = (n: number) => String(n).padStart(2, '0')

export const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return fmt(d)
}

export const today = () => fmt(new Date())

const WD = '日月火水木金土'
export const jpDate = (s: string) => {
  const d = parse(s)
  return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`
}

export const md = (s: string) => {
  const d = parse(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** その週の月曜日 */
export const mondayOf = (s: string) => addDays(s, -((parse(s).getDay() + 6) % 7))

export const daysBetween = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
