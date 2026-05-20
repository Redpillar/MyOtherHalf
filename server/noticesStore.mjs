import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const NOTICES_DATA_PATH = join(__dirname, 'data', 'notices.json')

/** @typedef {{ id: number; title: string; body: string; pinned: boolean; published: boolean; createdAt: string; updatedAt: string }} NoticeRow */

function ensureDir() {
  mkdirSync(dirname(NOTICES_DATA_PATH), { recursive: true })
}

/**
 * @param {NoticeRow} row
 * @returns {NoticeRow}
 */
function normalizeNoticeRow(row) {
  const title = String(row?.title || '').trim()
  const body = String(row?.body || '').trim()
  const createdAt = String(row?.createdAt || '').trim() || new Date().toISOString()
  const updatedAt = String(row?.updatedAt || '').trim() || createdAt
  return {
    id: Number(row?.id) || 0,
    title,
    body,
    pinned: Boolean(row?.pinned),
    published: row?.published !== false,
    createdAt,
    updatedAt,
  }
}

/** @returns {{ notices: NoticeRow[] }} */
export function loadNoticesDb() {
  if (!existsSync(NOTICES_DATA_PATH)) return { notices: [] }
  try {
    const raw = readFileSync(NOTICES_DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.notices)) return { notices: [] }
    return {
      notices: parsed.notices.map(normalizeNoticeRow).filter((x) => x.id > 0 && x.title && x.body),
    }
  } catch {
    return { notices: [] }
  }
}

/** @param {{ notices: NoticeRow[] }} data */
export function saveNoticesDb(data) {
  ensureDir()
  writeFileSync(NOTICES_DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function sortNotices(rows) {
  return rows.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.id - a.id
  })
}

function toSummary(row) {
  const excerptBase = row.body.replace(/\s+/g, ' ').trim()
  const excerpt = excerptBase.length > 120 ? `${excerptBase.slice(0, 120).trim()}...` : excerptBase
  return {
    id: row.id,
    title: row.title,
    excerpt,
    pinned: row.pinned,
    published: row.published,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function listNoticesPublic() {
  const db = loadNoticesDb()
  return sortNotices(db.notices)
    .filter((x) => x.published)
    .map((x) => ({
      id: x.id,
      title: x.title,
      excerpt: toSummary(x).excerpt,
      pinned: x.pinned,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    }))
}

export function listNoticesAdmin() {
  const db = loadNoticesDb()
  return sortNotices(db.notices).map((x) => ({
    id: x.id,
    title: x.title,
    excerpt: toSummary(x).excerpt,
    pinned: x.pinned,
    published: x.published,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  }))
}

/** @param {string|number} id */
export function getNoticeById(id) {
  const db = loadNoticesDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  return db.notices.find((x) => x.id === n) ?? null
}

/** @param {{ title: string; body: string; pinned?: boolean; published?: boolean }} row */
export function insertNotice(row) {
  const db = loadNoticesDb()
  const title = String(row?.title || '').trim()
  const body = String(row?.body || '').trim()
  if (!title) throw new Error('empty title')
  if (!body) throw new Error('empty body')
  const now = new Date().toISOString()
  const nextId = db.notices.reduce((m, x) => Math.max(m, x.id), 0) + 1
  const notice = {
    id: nextId,
    title,
    body,
    pinned: Boolean(row?.pinned),
    published: row?.published !== false,
    createdAt: now,
    updatedAt: now,
  }
  db.notices.push(notice)
  saveNoticesDb(db)
  return notice
}

/** @param {string|number} id @param {{ title?: string; body?: string; pinned?: boolean; published?: boolean }} patch */
export function updateNoticeRow(id, patch) {
  const db = loadNoticesDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const idx = db.notices.findIndex((x) => x.id === n)
  if (idx === -1) return null
  const prev = db.notices[idx]
  const title = patch.title !== undefined ? String(patch.title || '').trim() : prev.title
  const body = patch.body !== undefined ? String(patch.body || '').trim() : prev.body
  if (!title || !body) return null
  db.notices[idx] = {
    ...prev,
    title,
    body,
    pinned: patch.pinned !== undefined ? Boolean(patch.pinned) : prev.pinned,
    published: patch.published !== undefined ? Boolean(patch.published) : prev.published,
    updatedAt: new Date().toISOString(),
  }
  saveNoticesDb(db)
  return db.notices[idx]
}

/** @param {string|number} id */
export function deleteNoticeById(id) {
  const db = loadNoticesDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return false
  const idx = db.notices.findIndex((x) => x.id === n)
  if (idx === -1) return false
  db.notices.splice(idx, 1)
  saveNoticesDb(db)
  return true
}
