import { useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { saveSettings } from '../lib/db'
import { INTENSITIES } from '../lib/defaults'
import { addDays, jpDate, md, today } from '../lib/date'
import { useData } from '../lib/data'
import { f1 } from '../lib/pain'
import { computeStats, intensityGroups } from '../lib/stats'

const PERIODS = [
  ['30', '直近30日'],
  ['90', '直近90日'],
  ['365', '直近1年'],
  ['all', '全期間'],
] as const

const SERIES = [
  { key: 'during', name: '運動中', color: 'var(--s1)' },
  { key: 'after', name: '運動後', color: 'var(--s2)' },
  { key: 'next', name: '翌日', color: 'var(--s3)' },
] as const

const axisTick = { fill: 'var(--muted)', fontSize: 11 }
const catTick = { fill: 'var(--fg)', fontSize: 12 }
const cut = (s: string, n = 6) => (s.length > n ? s.slice(0, n) + '…' : s)

function Tip({ children }: { children: React.ReactNode }) {
  return <div className="chart-tip">{children}</div>
}

export function GraphPage() {
  const { records, idx, types, parts, settings } = useData()
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>('30')
  const [part, setPart] = useState('')
  const to = today()
  const from = period === 'all' ? '0000-01-01' : addDays(to, -Number(period) + 1)

  const s = useMemo(
    () => computeStats(records, idx, { from, to, part: part || null, intView: settings.intView, types }),
    [records, idx, from, to, part, settings.intView, types],
  )

  const ranked = s.types.filter((t) => t.n >= 3 && t.after != null).sort((a, b) => b.after! - a.after!)
  const groups = intensityGroups(settings.intView).map((g, i, arr) => ({
    ...g,
    name:
      settings.intView === '5'
        ? `${g.id} ${INTENSITIES[Number(g.id) - 1].name}`
        : ['抑えめ（1〜2）', 'ふつう（3）', '全力寄り（4〜5）'][i],
    color: arr.length === 5 ? `var(--i${g.id})` : `var(--i${[1, 3, 5][i]})`,
  }))
  const intRows = s.types
    .filter((t) => Object.keys(t.byIntensity).length >= 2)
    .map((t) => ({ name: t.name, ...Object.fromEntries(groups.map((g) => [g.id, t.byIntensity[g.id]?.after ?? null])), _t: t }))
  const minTop = Math.max(60, Math.ceil(Math.max(0, ...s.weeks.map((w) => w.minutes)) / 60) * 60)
  const partName = (id: string) => parts.find((p) => p.id === id)?.name ?? '（削除された部位）'

  if (records.length === 0) {
    return (
      <>
        <header className="top"><h1>グラフ</h1></header>
        <div className="section"><p className="empty">記録がたまると、ここに傾向が表示されます。</p></div>
      </>
    )
  }

  return (
    <>
      <header className="top"><h1>グラフ</h1></header>
      <div className="section stack">
        <div className="filters">
          <select className="inp" aria-label="期間" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="inp" aria-label="部位" value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="">全部位</option>
            {parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="tiles">
          <div className="tile"><div className="k">運動回数</div><div className="v">{s.exerciseCount}<small>回</small></div></div>
          <div className="tile"><div className="k">痛みの平均</div><div className="v">{f1(s.avgPain)}<small>/10</small></div></div>
          <div className="tile"><div className="k">痛み7以上</div><div className="v">{s.highDays}<small>日</small></div></div>
        </div>

        {/* 種類別 */}
        <section className="chartcard">
          <h2>運動の種類別 痛みの平均</h2>
          {ranked.length >= 2 && (
            <p className="small">
              運動後の痛みが最も高いのは<b>{ranked[0].name}</b>（平均 {f1(ranked[0].after)}）、低いのは<b>{ranked.at(-1)!.name}</b>（平均 {f1(ranked.at(-1)!.after)}）。
            </p>
          )}
          <div className="keys">{SERIES.map((x) => <span key={x.key}><i style={{ background: x.color }} />{x.name}</span>)}</div>
          {s.types.length ? (
            <ResponsiveContainer width="100%" height={30 + s.types.length * 46}>
              <BarChart data={s.types} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="var(--grid)" />
                <XAxis type="number" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} orientation="top" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  axisLine={{ stroke: 'var(--muted)' }}
                  tickLine={false}
                  tick={({ x, y, payload }) => {
                    const t = s.types.find((v) => v.name === payload.value)
                    return (
                      <g transform={`translate(${Number(x) - 6},${Number(y)})`}>
                        <text x={0} y={-2} textAnchor="end" fill="var(--fg)" fontSize={12}>{cut(String(payload.value))}</text>
                        <text x={0} y={13} textAnchor="end" fill="var(--muted)" fontSize={11}>{t?.n}回{t && t.n < 3 ? '・参考' : ''}</text>
                      </g>
                    )
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  content={({ active, payload }) => {
                    const t = active ? (payload?.[0]?.payload as (typeof s.types)[number] | undefined) : undefined
                    return t ? <Tip><b>{t.name}</b>（{t.n}回）<br />運動中 {f1(t.during)} ／ 運動後 {f1(t.after)} ／ 翌日 {f1(t.next)}</Tip> : null
                  }}
                />
                {SERIES.map((x) => <Bar key={x.key} dataKey={x.key} name={x.name} fill={x.color} barSize={9} radius={[0, 4, 4, 0]} isAnimationActive={false} />)}
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="muted">この期間の運動記録がありません。</p>}
          <Table head={['運動', '回数', '運動中', '運動後', '翌日']} rows={s.types.map((t) => [t.name, t.n, f1(t.during), f1(t.after), f1(t.next)])} />
        </section>

        {/* 強度別 */}
        <section className="chartcard">
          <h2>強度別 運動後の痛み</h2>
          <p className="small muted">同じ運動でも、強度で痛みがどう変わるか。薄い棒は 3 回未満の参考値です。</p>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="keys">{groups.map((g) => <span key={g.id}><i style={{ background: g.color }} />{g.name}</span>)}</div>
            <span className="seg" role="group" aria-label="強度の表示">
              {(['3', '5'] as const).map((v) => (
                <button type="button" key={v} aria-pressed={settings.intView === v} onClick={() => void saveSettings({ intView: v })}>
                  {v === '3' ? '3つにまとめる' : '5段階'}
                </button>
              ))}
            </span>
          </div>
          {intRows.length ? (
            <ResponsiveContainer width="100%" height={30 + intRows.length * (groups.length > 3 ? 54 : 44)}>
              <BarChart data={intRows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="var(--grid)" />
                <XAxis type="number" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} orientation="top" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={96} tick={catTick} tickFormatter={(v) => cut(String(v))} axisLine={{ stroke: 'var(--muted)' }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as (typeof intRows)[number] | undefined) : undefined
                    if (!row) return null
                    return (
                      <Tip>
                        <b>{row.name}</b> 運動後の痛み
                        {groups.map((g) => {
                          const v = row._t.byIntensity[g.id]
                          return <div key={g.id}>{g.name}: {v ? `${f1(v.after)}（${v.n}回${v.n < 3 ? '・参考' : ''}／翌日 ${f1(v.next)}）` : '記録なし'}</div>
                        })}
                      </Tip>
                    )
                  }}
                />
                {groups.map((g) => (
                  <Bar key={g.id} dataKey={g.id} name={g.name} fill={g.color} barSize={groups.length > 3 ? 7 : 9} radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {intRows.map((row, i) => <Cell key={i} fillOpacity={(row._t.byIntensity[g.id]?.n ?? 0) < 3 ? 0.45 : 1} />)}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="muted">強度を変えた記録がまだ少ないため表示できません。</p>}
          <Table
            head={['運動', ...groups.map((g) => g.name)]}
            rows={intRows.map((r) => [r.name, ...groups.map((g) => { const v = r._t.byIntensity[g.id]; return v ? `${f1(v.after)}（${v.n}回）` : '–' })])}
          />
        </section>

        {/* 痛んだ動き */}
        <section className="chartcard">
          <h2>痛んだ動き</h2>
          <p className="small muted">記録された回数と、そのときの痛みの平均。部位で絞り込むと、その部位が痛んだ動きだけになります。</p>
          {s.moves.length ? (
            <HBar
              data={s.moves.map((m) => ({ name: m.name, value: m.n, label: `${m.n}回・平均${f1(m.avg)}` }))}
              table={{
                head: ['動き', '回数', '平均', '痛んだ部位'],
                rows: s.moves.map((m) => [m.name, m.n, f1(m.avg), m.parts.map((x) => `${partName(x.id)} ${x.n}`).join('、')]),
              }}
            />
          ) : <p className="muted">この期間に「痛んだ動き」の記録がありません。</p>}
        </section>

        {/* 推移 */}
        <section className="chartcard">
          <h2>痛みの推移（日ごとの最大値）</h2>
          <div className="keys"><span><i style={{ background: 'var(--s2)', borderRadius: 99 }} />運動した日（タップで内容を表示）</span></div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={s.days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="ds" tickFormatter={md} tick={axisTick} minTickGap={28} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} width={24} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  const d = active ? (payload?.[0]?.payload as (typeof s.days)[number] | undefined) : undefined
                  return d ? <Tip><b>{jpDate(d.ds)}</b><br />痛み最大 {d.v ?? '記録なし'}{d.acts.length > 0 && <><br />{d.acts.join('・')}</>}</Tip> : null
                }}
              />
              <Area dataKey="v" stroke="none" fill="var(--s2)" fillOpacity={0.12} connectNulls isAnimationActive={false} />
              <Line
                dataKey="v"
                stroke="var(--s2)"
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                dot={(p) => {
                  const d = p.payload as (typeof s.days)[number]
                  return d.v != null && d.acts.length ? (
                    <circle key={p.key ?? p.index} cx={p.cx} cy={p.cy} r={4} fill="var(--s2)" stroke="var(--surface)" strokeWidth={2} />
                  ) : <g key={p.key ?? p.index} />
                }}
                activeDot={{ r: 5, fill: 'var(--s2)', stroke: 'var(--surface)', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </section>

        {/* 週ごと */}
        <section className="chartcard">
          <h2>週ごとの運動量と痛み</h2>
          <div className="small muted">運動時間（分／週）</div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={s.weeks} syncId="week" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="week" hide />
              <YAxis width={34} domain={[0, minTop]} ticks={[0, minTop / 2, minTop]} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload }) => {
                const w = active ? (payload?.[0]?.payload as (typeof s.weeks)[number] | undefined) : undefined
                return w ? <Tip><b>{md(w.week)}〜の週</b><br />運動 {w.minutes}分<br />痛みの平均 {f1(w.avg)}</Tip> : null
              }} />
              <Bar dataKey="minutes" fill="var(--s1)" maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <div className="small muted">痛みの平均（日ごとの最大値）</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={s.weeks} syncId="week" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="week" tickFormatter={md} tick={axisTick} minTickGap={20} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} width={34} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} content={() => null} />
              <Line dataKey="avg" stroke="var(--s2)" strokeWidth={2} connectNulls dot={{ r: 3, fill: 'var(--s2)', stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <Table head={['週', '運動（分）', '痛みの平均']} rows={s.weeks.map((w) => [`${md(w.week)}〜`, w.minutes, f1(w.avg)])} />
        </section>

        {/* 連日 */}
        <section className="chartcard">
          <h2>連日運動の影響（翌日の痛み）</h2>
          <div className="tiles two-col">
            <div className="tile"><div className="k">前日も運動した日の翌日</div><div className="v">{f1(s.consecutive.avg)}<small>/10</small></div><div className="k num">{s.consecutive.n}回</div></div>
            <div className="tile"><div className="k">間を空けた日の翌日</div><div className="v">{f1(s.spaced.avg)}<small>/10</small></div><div className="k num">{s.spaced.n}回</div></div>
          </div>
          {s.consecutive.avg != null && s.spaced.avg != null && (
            <p className="small">
              連日運動したときの翌日の痛みは、間を空けたときより <b>{f1(Math.abs(s.consecutive.avg - s.spaced.avg))}</b> {s.consecutive.avg >= s.spaced.avg ? '高い' : '低い'}です。
            </p>
          )}
        </section>

        {/* 部位別 */}
        <section className="chartcard">
          <h2>部位別 痛みが出た日数</h2>
          {s.parts.length ? (
            <HBar data={s.parts.map((p) => ({ name: partName(p.id), value: p.days, label: `${p.days}日・平均${f1(p.avg)}` }))} />
          ) : <p className="muted">この期間に痛みの記録がありません。</p>}
        </section>

        <p className="small muted" style={{ margin: 0 }}>
          集計ルール: 1つのタイミングに複数の痛みがあるときは最大値。「痛みなし」は 0、未記入は集計しません。翌日＝翌日の起床時の記録（なければその日の最大値）。
        </p>
      </div>
    </>
  )
}

/** 1 系列の横棒（ラベル付き） */
function HBar({ data, table }: { data: { name: string; value: number; label: string }[]; table?: { head: string[]; rows: (string | number)[][] } }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <>
      <ResponsiveContainer width="100%" height={data.length * 30 + 4}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 92, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="name" width={124} tick={catTick} tickFormatter={(v) => cut(String(v), 10)} axisLine={false} tickLine={false} />
          <Bar dataKey="value" fill="var(--s1)" barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="label" position="right" fill="var(--muted)" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {table ? <Table head={table.head} rows={table.rows} /> : <Table head={['', '日数', '平均']} rows={data.map((d) => [d.name, d.value, d.label.split('・')[1] ?? ''])} />}
    </>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return null
  return (
    <details className="tbl">
      <summary>表で見る</summary>
      <div className="tblwrap">
        <table>
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  )
}
