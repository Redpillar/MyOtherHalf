import { useSyncExternalStore } from 'react'
import { siteNavItems, type SiteNavId } from '../config/nav'

const STORAGE_KEY = 'demo_site_header_nav'
const EVT = 'demo-site-header-nav'

export type SiteHeaderNavVisibility = Record<SiteNavId, boolean>

export type SiteHeaderNavConfig = {
  whenLoggedOut: SiteHeaderNavVisibility
  whenLoggedIn: SiteHeaderNavVisibility
}

function allTrue(): SiteHeaderNavVisibility {
  const o = {} as SiteHeaderNavVisibility
  for (const item of siteNavItems) {
    o[item.id] = true
  }
  return o
}

function mergeVisibility(raw: unknown): SiteHeaderNavVisibility {
  const base = allTrue()
  if (!raw || typeof raw !== 'object') return base
  const x = raw as Record<string, unknown>
  for (const item of siteNavItems) {
    if (Object.prototype.hasOwnProperty.call(x, item.id)) {
      base[item.id] = Boolean(x[item.id])
    }
  }
  return base
}

/** 로그인 후 1:1 문의는 항상 헤더에 두도록 고정 (관리자 설정으로 숨길 수 없음). */
function whenLoggedInWithContact(vis: SiteHeaderNavVisibility): SiteHeaderNavVisibility {
  return { ...vis, contact: true }
}

function isLegacyFlatNav(parsed: Record<string, unknown>): boolean {
  if ('whenLoggedOut' in parsed || 'whenLoggedIn' in parsed) return false
  return siteNavItems.some((item) => Object.prototype.hasOwnProperty.call(parsed, item.id))
}

function readFromStorage(): SiteHeaderNavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        whenLoggedOut: allTrue(),
        whenLoggedIn: allTrue(),
      }
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (isLegacyFlatNav(parsed)) {
      const merged = mergeVisibility(parsed)
      return { whenLoggedOut: merged, whenLoggedIn: whenLoggedInWithContact(merged) }
    }
    return {
      whenLoggedOut: mergeVisibility(parsed.whenLoggedOut),
      whenLoggedIn: whenLoggedInWithContact(mergeVisibility(parsed.whenLoggedIn)),
    }
  } catch {
    return {
      whenLoggedOut: allTrue(),
      whenLoggedIn: allTrue(),
    }
  }
}

let snapshot: SiteHeaderNavConfig =
  typeof window !== 'undefined' ? readFromStorage() : { whenLoggedOut: allTrue(), whenLoggedIn: allTrue() }

function syncSnapshotFromStorage() {
  snapshot = readFromStorage()
}

export function loadSiteHeaderNavConfig(): SiteHeaderNavConfig {
  return snapshot
}

export function saveSiteHeaderNavConfig(next: SiteHeaderNavConfig) {
  const copy: SiteHeaderNavConfig = {
    whenLoggedOut: { ...next.whenLoggedOut },
    whenLoggedIn: whenLoggedInWithContact(next.whenLoggedIn),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  snapshot = copy
  window.dispatchEvent(new Event(EVT))
}

export function subscribeSiteHeaderNav(callback: () => void) {
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

function getServerSnapshot(): SiteHeaderNavConfig {
  if (typeof window === 'undefined') {
    return {
      whenLoggedOut: allTrue(),
      whenLoggedIn: allTrue(),
    }
  }
  return snapshot
}

export function useSiteHeaderNavConfig(): SiteHeaderNavConfig {
  return useSyncExternalStore(subscribeSiteHeaderNav, loadSiteHeaderNavConfig, getServerSnapshot)
}
