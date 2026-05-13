import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'demo_admin_ui_settings'
const EVT = 'demo-admin-ui-settings'

/** 로그아웃 상태 상단 메뉴 */
export type AdminMenuWhenLoggedOut = {
  /** `/admin` 관리자 로그인 링크 */
  loginLink: boolean
  /** `/admin/settings` 설정 링크 */
  settingsLink: boolean
}

/** 로그인 상태 상단 메뉴 */
export type AdminMenuWhenLoggedIn = {
  /** `/admin/dashboard` 관리자 홈 */
  dashboard: boolean
  members: boolean
  managerList: boolean
  managerRegister: boolean
  settings: boolean
  /** `/admin/inquiries` 1:1 문의 관리 */
  inquiries: boolean
  /** `/admin/recommendations` 랜딩 추천 문구 */
  recommendations: boolean
  /** `/admin/menu-settings` */
  menuSettings: boolean
  logout: boolean
}

export type AdminUiSettings = {
  compactMemberTable: boolean
  confirmBeforeLogout: boolean
  menuWhenLoggedOut: AdminMenuWhenLoggedOut
  menuWhenLoggedIn: AdminMenuWhenLoggedIn
}

const DEFAULT_MENU_LOGGED_OUT: AdminMenuWhenLoggedOut = {
  loginLink: true,
  settingsLink: false,
}

const DEFAULT_MENU_LOGGED_IN: AdminMenuWhenLoggedIn = {
  dashboard: true,
  members: true,
  managerList: true,
  managerRegister: true,
  settings: true,
  inquiries: true,
  recommendations: true,
  menuSettings: true,
  logout: true,
}

const DEFAULTS: AdminUiSettings = {
  compactMemberTable: false,
  confirmBeforeLogout: false,
  menuWhenLoggedOut: { ...DEFAULT_MENU_LOGGED_OUT },
  menuWhenLoggedIn: { ...DEFAULT_MENU_LOGGED_IN },
}

function mergeMenuLoggedOut(o: unknown): AdminMenuWhenLoggedOut {
  if (!o || typeof o !== 'object') return { ...DEFAULT_MENU_LOGGED_OUT }
  const x = o as Record<string, unknown>
  return {
    loginLink: x.loginLink !== false,
    settingsLink: Boolean(x.settingsLink),
  }
}

function mergeMenuLoggedIn(o: unknown): AdminMenuWhenLoggedIn {
  if (!o || typeof o !== 'object') return { ...DEFAULT_MENU_LOGGED_IN }
  const x = o as Record<string, unknown>
  return {
    dashboard: x.dashboard !== false,
    members: x.members !== false,
    managerList: x.managerList !== false,
    managerRegister: x.managerRegister !== false,
    settings: x.settings !== false,
    menuSettings: x.menuSettings !== false,
    inquiries: x.inquiries !== false,
    recommendations: x.recommendations !== false,
    logout: x.logout !== false,
  }
}

function readFromStorage(): AdminUiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS, menuWhenLoggedOut: { ...DEFAULT_MENU_LOGGED_OUT }, menuWhenLoggedIn: { ...DEFAULT_MENU_LOGGED_IN } }
    const o = JSON.parse(raw) as Partial<AdminUiSettings> & {
      menuWhenLoggedOut?: unknown
      menuWhenLoggedIn?: unknown
    }
    return {
      compactMemberTable: Boolean(o.compactMemberTable),
      confirmBeforeLogout: Boolean(o.confirmBeforeLogout),
      menuWhenLoggedOut: mergeMenuLoggedOut(o.menuWhenLoggedOut),
      menuWhenLoggedIn: mergeMenuLoggedIn(o.menuWhenLoggedIn),
    }
  } catch {
    return { ...DEFAULTS, menuWhenLoggedOut: { ...DEFAULT_MENU_LOGGED_OUT }, menuWhenLoggedIn: { ...DEFAULT_MENU_LOGGED_IN } }
  }
}

/** 모듈 스냅샷 — `useSyncExternalStore`는 참조/값이 안 바뀐 것과 동일한 스냅샷을 기대합니다. */
let snapshot: AdminUiSettings = typeof window !== 'undefined' ? readFromStorage() : { ...DEFAULTS }

function syncSnapshotFromStorage() {
  snapshot = readFromStorage()
}

export function loadAdminUiSettings(): AdminUiSettings {
  return snapshot
}

export function saveAdminUiSettings(next: AdminUiSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  snapshot = {
    ...next,
    menuWhenLoggedOut: { ...next.menuWhenLoggedOut },
    menuWhenLoggedIn: { ...next.menuWhenLoggedIn },
  }
  window.dispatchEvent(new Event(EVT))
}

export function subscribeAdminUiSettings(callback: () => void) {
  const onEvt = () => {
    syncSnapshotFromStorage()
    callback()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      syncSnapshotFromStorage()
      callback()
    }
  }
  window.addEventListener(EVT, onEvt)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVT, onEvt)
    window.removeEventListener('storage', onStorage)
  }
}

function getServerSnapshot(): AdminUiSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  return snapshot
}

export function useAdminUiSettings(): AdminUiSettings {
  return useSyncExternalStore(subscribeAdminUiSettings, loadAdminUiSettings, getServerSnapshot)
}
