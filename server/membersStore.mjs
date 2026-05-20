import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DATA_PATH = join(__dirname, 'data', 'members.json')

/** @typedef {{ id: number; phone: string; name: string; birth: string; userId: string; passwordHash: string; gender: string; height: string; weight: string; job: string; region1: string; region2: string; education: string; mbti: string; smoke: string; drink: string; car: string; appeal: string; obligationAgreed: boolean; createdAt: string; photos?: string[]; locationLat?: number | null; locationLng?: number | null; locationAccuracyM?: number | null; locationUpdatedAt?: string; consultationStatus?: string; consultationRequestedAt?: string }} Member */

function ensureDir() {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
}

/** @returns {{ members: Member[] }} */
export function loadDb() {
  if (!existsSync(DATA_PATH)) {
    return { members: [] }
  }
  try {
    const raw = readFileSync(DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.members)) return { members: [] }
    return { members: parsed.members }
  } catch {
    return { members: [] }
  }
}

/** @param {{ members: Member[] }} data */
export function saveDb(data) {
  ensureDir()
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

/** @param {Omit<Member, 'id' | 'createdAt'>} row */
export function insertMember(row) {
  const db = loadDb()
  const nextId = db.members.reduce((m, x) => Math.max(m, x.id), 0) + 1
  const member = {
    ...row,
    photos: Array.isArray(row.photos) ? row.photos : [],
    id: nextId,
    createdAt: new Date().toISOString(),
  }
  db.members.push(member)
  saveDb(db)
  return member
}

/** @param {string|number} id @param {Partial<Member>} patch */
export function updateMember(id, patch) {
  const db = loadDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const i = db.members.findIndex((x) => x.id === n)
  if (i === -1) return null
  db.members[i] = { ...db.members[i], ...patch }
  saveDb(db)
  return db.members[i]
}

export function listMembers() {
  const db = loadDb()
  return db.members.slice().sort((a, b) => b.id - a.id)
}

/** @param {string|number} id */
export function getMemberById(id) {
  const db = loadDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  return db.members.find((x) => x.id === n) ?? null
}

/** @param {string} userId */
export function findByUserId(userId) {
  const db = loadDb()
  return db.members.find((m) => m.userId === userId) ?? null
}

export function listMembersPublic() {
  const db = loadDb()
  return db.members
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((m) => ({
      id: m.id,
      phone: m.phone,
      name: m.name,
      birth: m.birth,
      userId: m.userId,
      gender: m.gender,
      height: m.height,
      weight: m.weight,
      job: m.job,
      region1: m.region1,
      region2: m.region2,
      education: m.education,
      mbti: m.mbti,
      smoke: m.smoke,
      drink: m.drink,
      car: m.car,
      appeal: m.appeal,
      obligationAgreed: m.obligationAgreed,
      createdAt: m.createdAt,
      photoCount: Array.isArray(m.photos) ? m.photos.length : 0,
    }))
}

/** @param {string|number} id */
export function getMemberPublicById(id) {
  const db = loadDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const m = db.members.find((x) => x.id === n)
  if (!m) return null
  const { passwordHash: _p, ...rest } = m
  return rest
}
