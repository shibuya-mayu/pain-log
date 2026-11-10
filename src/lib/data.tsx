import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { db } from './db'
import { DEFAULT_SETTINGS } from './defaults'
import { indexByDate, type ByDate } from './stats'
import type { BodyPart, ExerciseType, LogRecord, Settings } from './types'

interface Data {
  ready: boolean
  records: LogRecord[]
  idx: ByDate
  types: ExerciseType[]
  parts: BodyPart[]
  settings: Settings
  toast: (msg: string) => void
}

const Ctx = createContext<Data | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const records = useLiveQuery(() => db.records.toArray(), [])
  const types = useLiveQuery(() => db.types.orderBy('order').toArray(), [])
  const parts = useLiveQuery(() => db.parts.orderBy('order').toArray(), [])
  const settingsRow = useLiveQuery(() => db.kv.get('settings'), [])
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const toast = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2600)
  }, [])

  const value = useMemo<Data>(() => {
    const recs = records ?? []
    return {
      ready: records !== undefined && types !== undefined && parts !== undefined,
      records: recs,
      idx: indexByDate(recs),
      types: types ?? [],
      parts: parts ?? [],
      settings: { ...DEFAULT_SETTINGS, ...((settingsRow?.value as Partial<Settings>) ?? {}) },
      toast,
    }
  }, [records, types, parts, settingsRow, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  )
}

export function useData() {
  const d = useContext(Ctx)
  if (!d) throw new Error('DataProvider がありません')
  return d
}
