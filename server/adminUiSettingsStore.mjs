import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data', 'admin-ui-settings.json')

const DEFAULTS = {
  compactMemberTable: false,
  confirmBeforeLogout: false,
  menuWhenLoggedOut: {
    loginLink: true,
    settingsLink: false,
  },
  menuWhenLoggedIn: {
    dashboard: true,
    members: true,
    managerList: true,
    managerRegister: true,
    settings: true,
    inquiries: true,
    notices: true,
    reviews: true,
    recommendations: true,
    menuSettings: true,
    logout: true,
  },
}

function readJsonSafe() {
  try {
    if (!existsSync(DATA_PATH)) return { ...DEFAULTS }
    const raw = readFileSync(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS }
    return {
      ...DEFAULTS,
      ...parsed,
      menuWhenLoggedOut: { ...DEFAULTS.menuWhenLoggedOut, ...(parsed.menuWhenLoggedOut || {}) },
      menuWhenLoggedIn: { ...DEFAULTS.menuWhenLoggedIn, ...(parsed.menuWhenLoggedIn || {}) },
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeJsonAtomic(obj) {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
  const tmp = `${DATA_PATH}.tmp`
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  renameSync(tmp, DATA_PATH)
}

let snapshot = readJsonSafe()

export function getAdminUiSettings() {
  return snapshot
}

export function setAdminUiSettings(next) {
  const merged = {
    ...DEFAULTS,
    ...next,
    menuWhenLoggedOut: { ...DEFAULTS.menuWhenLoggedOut, ...(next?.menuWhenLoggedOut || {}) },
    menuWhenLoggedIn: { ...DEFAULTS.menuWhenLoggedIn, ...(next?.menuWhenLoggedIn || {}) },
  }
  snapshot = merged
  writeJsonAtomic(merged)
  return snapshot
}

