import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data', 'landing-member-stats.json')

const DEFAULTS = {
  maleMembers: 35430,
  femaleMembers: 33490,
}

function clampInt(n, min, max) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

export function normalizeLandingMemberStats(raw) {
  return {
    maleMembers: clampInt(raw?.maleMembers ?? DEFAULTS.maleMembers, 0, 99_999_999),
    femaleMembers: clampInt(raw?.femaleMembers ?? DEFAULTS.femaleMembers, 0, 99_999_999),
  }
}

function readJsonSafe() {
  try {
    if (!existsSync(DATA_PATH)) return normalizeLandingMemberStats(DEFAULTS)
    const raw = readFileSync(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return normalizeLandingMemberStats(DEFAULTS)
    return normalizeLandingMemberStats(parsed)
  } catch {
    return normalizeLandingMemberStats(DEFAULTS)
  }
}

function writeJsonAtomic(obj) {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
  const tmp = `${DATA_PATH}.tmp`
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  renameSync(tmp, DATA_PATH)
}

let snapshot = readJsonSafe()

export function getLandingMemberStats() {
  return snapshot
}

export function setLandingMemberStats(next) {
  snapshot = normalizeLandingMemberStats(next)
  writeJsonAtomic(snapshot)
  return snapshot
}
