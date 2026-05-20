import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data', 'landing-kpi.json')

const DEFAULTS = {
  cumulativeMembers: 47758,
  cumulativeCouples: 55572,
  inProgress: 74,
  successRate: 98,
}

function clampInt(n, min, max) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

export function normalizeLandingKpi(raw) {
  return {
    cumulativeMembers: clampInt(raw?.cumulativeMembers ?? DEFAULTS.cumulativeMembers, 0, 99_999_999),
    cumulativeCouples: clampInt(raw?.cumulativeCouples ?? DEFAULTS.cumulativeCouples, 0, 99_999_999),
    inProgress: clampInt(raw?.inProgress ?? DEFAULTS.inProgress, 0, 99_999_999),
    successRate: clampInt(raw?.successRate ?? DEFAULTS.successRate, 0, 100),
  }
}

function readJsonSafe() {
  try {
    if (!existsSync(DATA_PATH)) return normalizeLandingKpi(DEFAULTS)
    const raw = readFileSync(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return normalizeLandingKpi(DEFAULTS)
    return normalizeLandingKpi(parsed)
  } catch {
    return normalizeLandingKpi(DEFAULTS)
  }
}

function writeJsonAtomic(obj) {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
  const tmp = `${DATA_PATH}.tmp`
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  renameSync(tmp, DATA_PATH)
}

let snapshot = readJsonSafe()

export function getLandingKpi() {
  return snapshot
}

export function setLandingKpi(next) {
  snapshot = normalizeLandingKpi(next)
  writeJsonAtomic(snapshot)
  return snapshot
}
