import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const MANAGERS_DATA_PATH = join(__dirname, 'data', 'managers.json')

/** @typedef {{ id: number; name: string; photoFile: string; ratingStars: number; successCount: number; reviewCount: number; createdAt: string }} ManagerRow */

function ensureDir() {
  mkdirSync(dirname(MANAGERS_DATA_PATH), { recursive: true })
}

/** @returns {{ managers: ManagerRow[] }} */
export function loadManagersDb() {
  if (!existsSync(MANAGERS_DATA_PATH)) {
    return { managers: [] }
  }
  try {
    const raw = readFileSync(MANAGERS_DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.managers)) return { managers: [] }
    return { managers: parsed.managers }
  } catch {
    return { managers: [] }
  }
}

/** @param {{ managers: ManagerRow[] }} data */
export function saveManagersDb(data) {
  ensureDir()
  writeFileSync(MANAGERS_DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

/** @param {Omit<ManagerRow, 'id' | 'createdAt' | 'photoFile'> & { photoFile?: string }} row */
export function insertManager(row) {
  const db = loadManagersDb()
  const nextId = db.managers.reduce((m, x) => Math.max(m, x.id), 0) + 1
  const manager = {
    ...row,
    photoFile: row.photoFile || '',
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  db.managers.push(manager)
  saveManagersDb(db)
  return manager
}

/** @param {string|number} id @param {Partial<ManagerRow>} patch */
export function updateManagerRow(id, patch) {
  const db = loadManagersDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const i = db.managers.findIndex((x) => x.id === n)
  if (i === -1) return null
  db.managers[i] = { ...db.managers[i], ...patch }
  saveManagersDb(db)
  return db.managers[i]
}

/** @param {string|number} id */
export function getManagerById(id) {
  const db = loadManagersDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  return db.managers.find((x) => x.id === n) ?? null
}

export function listManagersPublic() {
  const db = loadManagersDb()
  return db.managers
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((m) => ({
      id: m.id,
      name: m.name,
      ratingStars: m.ratingStars,
      successCount: m.successCount,
      reviewCount: m.reviewCount,
      hasPhoto: Boolean(m.photoFile),
    }))
}

/** 관리자 목록·수정 화면용 */
export function listManagersAdmin() {
  const db = loadManagersDb()
  return db.managers
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((m) => ({
      id: m.id,
      name: m.name,
      ratingStars: m.ratingStars,
      successCount: m.successCount,
      reviewCount: m.reviewCount,
      hasPhoto: Boolean(m.photoFile),
      createdAt: m.createdAt || '',
    }))
}
