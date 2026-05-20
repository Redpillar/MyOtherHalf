import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const MANAGERS_DATA_PATH = join(__dirname, 'data', 'managers.json')

/** @typedef {{ id: number; name: string; intro: string; tags: string; consultMethod: string; photoFile: string; successCount: number; createdAt: string }} ManagerRow */

function parseManagerTags(raw) {
  return String(raw || '')
    .split(/[,，、]/)
    .map((s) => s.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8)
}

function normalizeManagerTags(raw) {
  return parseManagerTags(raw).join(', ')
}

function managerPublicDto(m) {
  return {
    id: m.id,
    name: m.name,
    intro: String(m.intro || '').trim(),
    tags: parseManagerTags(m.tags),
    consultMethod: String(m.consultMethod || '').trim(),
    successCount: Math.max(0, Math.floor(Number(m.successCount) || 0)),
    hasPhoto: Boolean(m.photoFile),
  }
}

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
    intro: String(row.intro || '').trim(),
    tags: normalizeManagerTags(row.tags),
    consultMethod: String(row.consultMethod || '').trim(),
    successCount: Math.max(0, Math.floor(Number(row.successCount) || 0)),
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
  const next = { ...db.managers[i], ...patch }
  if (patch.tags !== undefined) {
    next.tags = normalizeManagerTags(patch.tags)
  }
  if (patch.consultMethod !== undefined) {
    next.consultMethod = String(patch.consultMethod || '').trim()
  }
  if (patch.intro !== undefined) {
    next.intro = String(patch.intro || '').trim()
  }
  db.managers[i] = next
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
    .map(managerPublicDto)
}

/** 관리자 목록·수정 화면용 */
export function listManagersAdmin() {
  const db = loadManagersDb()
  return db.managers
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((m) => managerAdminDto(m))
}

/** @param {ManagerRow | null | undefined} m */
export function managerAdminDto(m) {
  if (!m) return null
  return {
    ...managerPublicDto(m),
    createdAt: m.createdAt || '',
  }
}
