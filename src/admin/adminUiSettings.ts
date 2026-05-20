import { useSyncExternalStore } from 'react'

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
  /** `/admin/notices` 공지사항 관리 */
  notices: boolean
  /** `/admin/reviews` 커플 후기 관리 */
  reviews: boolean
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
  notices: true,
  reviews: true,
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
    notices: x.notices !== false,
    reviews: x.reviews !== false,
    recommendations: x.recommendations !== false,
    logout: x.logout !== false,
  }
}

/** 모듈 스냅샷 — `useSyncExternalStore`는 참조/값이 안 바뀐 것과 동일한 스냅샷을 기대합니다. */
let snapshot: AdminUiSettings = { ...DEFAULTS }

function setSnapshot(next: AdminUiSettings) {
  snapshot = {
    ...next,
    menuWhenLoggedOut: { ...next.menuWhenLoggedOut },
    menuWhenLoggedIn: { ...next.menuWhenLoggedIn },
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT))
}

async function fetchFromServer(): Promise<AdminUiSettings> {
  const r = await fetch('/api/admin/ui-settings')
  if (!r.ok) throw new Error('failed')
  const j = (await r.json()) as { settings?: unknown }
  const o = (j.settings || {}) as Partial<AdminUiSettings> & {
    menuWhenLoggedOut?: unknown
    menuWhenLoggedIn?: unknown
  }
  return {
    compactMemberTable: Boolean(o.compactMemberTable),
    confirmBeforeLogout: Boolean(o.confirmBeforeLogout),
    menuWhenLoggedOut: mergeMenuLoggedOut(o.menuWhenLoggedOut),
    menuWhenLoggedIn: mergeMenuLoggedIn(o.menuWhenLoggedIn),
  }
}

export async function refreshAdminUiSettings() {
  try {
    const next = await fetchFromServer()
    setSnapshot(next)
  } catch {
    // ignore (offline/dev)
  }
}

export function loadAdminUiSettings(): AdminUiSettings {
  return snapshot
}

export async function saveAdminUiSettings(next: AdminUiSettings, token: string) {
  const r = await fetch('/api/admin/ui-settings', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(next),
  })
  if (!r.ok) throw new Error('저장에 실패했습니다.')
  const j = (await r.json()) as { settings?: unknown }
  const o = (j.settings || next) as Partial<AdminUiSettings> & {
    menuWhenLoggedOut?: unknown
    menuWhenLoggedIn?: unknown
  }
  const merged: AdminUiSettings = {
    compactMemberTable: Boolean(o.compactMemberTable),
    confirmBeforeLogout: Boolean(o.confirmBeforeLogout),
    menuWhenLoggedOut: mergeMenuLoggedOut(o.menuWhenLoggedOut),
    menuWhenLoggedIn: mergeMenuLoggedIn(o.menuWhenLoggedIn),
  }
  setSnapshot(merged)
}

export function subscribeAdminUiSettings(callback: () => void) {
  const onEvt = () => callback()
  window.addEventListener(EVT, onEvt)
  return () => {
    window.removeEventListener(EVT, onEvt)
  }
}

function getServerSnapshot(): AdminUiSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  return snapshot
}

export function useAdminUiSettings(): AdminUiSettings {
  return useSyncExternalStore(subscribeAdminUiSettings, loadAdminUiSettings, getServerSnapshot)
}

// kick off an initial fetch on the client
if (typeof window !== 'undefined') void refreshAdminUiSettings()
