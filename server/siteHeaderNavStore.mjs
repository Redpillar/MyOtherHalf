import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data', 'site-header-nav.json')

const DEFAULTS = {
  whenLoggedOut: {},
  whenLoggedIn: {},
}

function sanitize(cfg) {
  const base = {
    whenLoggedOut: { ...(cfg?.whenLoggedOut || {}) },
    whenLoggedIn: { ...(cfg?.whenLoggedIn || {}) },
  }
  // contact (1:1 문의)는 로그인 상태에서 항상 true로 고정
  base.whenLoggedIn = { ...base.whenLoggedIn, contact: true }
  return base
}

function readJsonSafe() {
  try {
    if (!existsSync(DATA_PATH)) return sanitize(DEFAULTS)
    const raw = readFileSync(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return sanitize(DEFAULTS)
    return sanitize(parsed)
  } catch {
    return sanitize(DEFAULTS)
  }
}

function writeJsonAtomic(obj) {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
  const tmp = `${DATA_PATH}.tmp`
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  renameSync(tmp, DATA_PATH)
}

let snapshot = readJsonSafe()

export function getSiteHeaderNavConfig() {
  return snapshot
}

export function setSiteHeaderNavConfig(next) {
  const merged = sanitize(next || {})
  snapshot = merged
  writeJsonAtomic(merged)
  return snapshot
}

