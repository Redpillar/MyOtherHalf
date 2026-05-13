import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const INQUIRIES_DATA_PATH = join(__dirname, 'data', 'inquiries.json')

/** @typedef {{ id: number; memberUserId: string; name: string; email: string; phone: string; title: string; body: string; status: 'new' | 'in_progress' | 'closed'; adminMemo: string; reply: string; replyAt: string; createdAt: string; updatedAt: string }} InquiryRow */

function ensureDir() {
  mkdirSync(dirname(INQUIRIES_DATA_PATH), { recursive: true })
}

/** @returns {{ inquiries: InquiryRow[] }} */
export function loadInquiriesDb() {
  if (!existsSync(INQUIRIES_DATA_PATH)) {
    return { inquiries: [] }
  }
  try {
    const raw = readFileSync(INQUIRIES_DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.inquiries)) return { inquiries: [] }
    return { inquiries: parsed.inquiries }
  } catch {
    return { inquiries: [] }
  }
}

/** @param {{ inquiries: InquiryRow[] }} data */
export function saveInquiriesDb(data) {
  ensureDir()
  writeFileSync(INQUIRIES_DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

/** @param {Omit<InquiryRow, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'adminMemo'> & { status?: InquiryRow['status']; adminMemo?: string }} row */
export function insertInquiry(row) {
  const db = loadInquiriesDb()
  const now = new Date().toISOString()
  const nextId = db.inquiries.reduce((m, x) => Math.max(m, x.id), 0) + 1
  const inquiry = {
    memberUserId: String(row.memberUserId || '').trim(),
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    title: row.title,
    body: row.body,
    status: row.status || 'new',
    adminMemo: row.adminMemo ?? '',
    reply: '',
    replyAt: '',
    id: nextId,
    createdAt: now,
    updatedAt: now,
  }
  db.inquiries.push(inquiry)
  saveInquiriesDb(db)
  return inquiry
}

/** @param {string|number} id @param {Partial<InquiryRow>} patch */
export function updateInquiryRow(id, patch) {
  const db = loadInquiriesDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const i = db.inquiries.findIndex((x) => x.id === n)
  if (i === -1) return null
  const now = new Date().toISOString()
  db.inquiries[i] = {
    ...db.inquiries[i],
    ...patch,
    updatedAt: now,
  }
  saveInquiriesDb(db)
  return db.inquiries[i]
}

/** @param {string|number} id */
export function getInquiryById(id) {
  const db = loadInquiriesDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  return db.inquiries.find((x) => x.id === n) ?? null
}

export function listInquiriesAdmin() {
  const db = loadInquiriesDb()
  return db.inquiries.slice().sort((a, b) => b.id - a.id)
}

/** 공개 목록용 (개인정보 제외). `filterMemberUserId`가 있으면 해당 회원 문의만. */
export function listInquiriesPublic(filterMemberUserId) {
  const db = loadInquiriesDb()
  const m = String(filterMemberUserId || '').trim()
  let rows = db.inquiries.slice().sort((a, b) => b.id - a.id)
  if (m) rows = rows.filter((r) => String(r.memberUserId || '').trim() === m)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.createdAt,
    status: r.status,
    hasReply: Boolean(String(r.reply || '').trim()),
  }))
}
