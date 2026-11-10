import { db, loadSettings, nowIso, saveSettings } from './db'
import { today } from './date'
import type { BodyPart, ExerciseType, LogRecord, Settings } from './types'

export interface BackupFile {
  app: 'pain-log'
  version: 1
  exportedAt: string
  records: LogRecord[]
  types: ExerciseType[]
  parts: BodyPart[]
  settings: Settings
}

export async function buildBackup(): Promise<BackupFile> {
  return {
    app: 'pain-log',
    version: 1,
    exportedAt: nowIso(),
    records: await db.records.toArray(),
    types: await db.types.toArray(),
    parts: await db.parts.toArray(),
    settings: await loadSettings(),
  }
}

/**
 * バックアップを書き出す。
 * スマホでは共有シート（「ファイルに保存」→ iCloud Drive など）を使い、
 * 使えない環境ではダウンロードする。
 */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await buildBackup()
  const name = `pain-log-${today()}.json`
  const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' })
  let result: 'shared' | 'downloaded' | 'cancelled' = 'downloaded'
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      result = 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      downloadFile(file)
    }
  } else {
    downloadFile(file)
  }
  await saveSettings({ lastBackupAt: nowIso() })
  return result
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('ファイルを読み取れませんでした。書き出した .json ファイルを選んでください。')
  }
  const d = data as Partial<BackupFile>
  if (d?.app !== 'pain-log' || !Array.isArray(d.records) || !Array.isArray(d.types) || !Array.isArray(d.parts)) {
    throw new Error('このアプリのバックアップファイルではありません。')
  }
  return d as BackupFile
}

/** 今のデータをすべて置き換える */
export async function restoreBackup(b: BackupFile) {
  await db.transaction('rw', [db.records, db.types, db.parts, db.kv], async () => {
    await Promise.all([db.records.clear(), db.types.clear(), db.parts.clear()])
    await db.records.bulkAdd(b.records)
    await db.types.bulkAdd(b.types)
    await db.parts.bulkAdd(b.parts)
    await db.kv.put({ key: 'settings', value: b.settings })
  })
}
