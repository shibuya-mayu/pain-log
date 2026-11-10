import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_PARTS, DEFAULT_SETTINGS, DEFAULT_TYPES } from './defaults'
import type { BodyPart, ExerciseType, LogRecord, Settings } from './types'

interface KV {
  key: string
  value: unknown
}

export const db = new Dexie('pain-log') as Dexie & {
  records: EntityTable<LogRecord, 'id'>
  types: EntityTable<ExerciseType, 'id'>
  parts: EntityTable<BodyPart, 'id'>
  kv: EntityTable<KV, 'key'>
}

db.version(1).stores({
  records: 'id, date, kind',
  types: 'id, order',
  parts: 'id, order',
  kv: 'key',
})

db.on('populate', async (tx) => {
  await tx.table('types').bulkAdd(DEFAULT_TYPES)
  await tx.table('parts').bulkAdd(DEFAULT_PARTS)
})

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await loadSettings()
  await db.kv.put({ key: 'settings', value: { ...cur, ...patch } })
}

/**
 * 記録の ID。crypto.randomUUID は HTTPS（または localhost）でしか使えないため、
 * 使えない場合は getRandomValues で同じ形式の ID を作る。
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
export const nowIso = () => new Date().toISOString()

export async function saveRecord(r: LogRecord) {
  await db.records.put({ ...r, updatedAt: nowIso() })
}

export async function deleteRecord(id: string) {
  await db.records.delete(id)
}

/** ブラウザにデータを消されにくくする（ホーム画面に追加した PWA では通常許可される） */
export async function requestPersist() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
