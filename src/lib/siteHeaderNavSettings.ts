import { useSyncExternalStore } from 'react'
import { siteNavItems, type SiteNavId } from '../config/nav'

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

let snapshot: SiteHeaderNavConfig = { whenLoggedOut: allTrue(), whenLoggedIn: allTrue() }

function setSnapshot(next: SiteHeaderNavConfig) {
  snapshot = {
    whenLoggedOut: { ...next.whenLoggedOut },
    whenLoggedIn: whenLoggedInWithContact({ ...next.whenLoggedIn }),
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT))
}

async function fetchFromServer(): Promise<SiteHeaderNavConfig> {
  const r = await fetch('/api/site-header-nav')
  if (!r.ok) throw new Error('failed')
  const j = (await r.json()) as { config?: unknown }
  const parsed = (j.config || {}) as Record<string, unknown>
  if (isLegacyFlatNav(parsed)) {
    const merged = mergeVisibility(parsed)
    return { whenLoggedOut: merged, whenLoggedIn: whenLoggedInWithContact(merged) }
  }
  return {
    whenLoggedOut: mergeVisibility(parsed.whenLoggedOut),
    whenLoggedIn: whenLoggedInWithContact(mergeVisibility(parsed.whenLoggedIn)),
  }
}

export async function refreshSiteHeaderNavConfig() {
  try {
    const next = await fetchFromServer()
    setSnapshot(next)
  } catch {
    // ignore
  }
}

export function loadSiteHeaderNavConfig(): SiteHeaderNavConfig {
  return snapshot
}

export async function saveSiteHeaderNavConfig(next: SiteHeaderNavConfig, token: string) {
  const copy: SiteHeaderNavConfig = {
    whenLoggedOut: { ...next.whenLoggedOut },
    whenLoggedIn: whenLoggedInWithContact(next.whenLoggedIn),
  }
  const r = await fetch('/api/admin/site-header-nav', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(copy),
  })
  if (!r.ok) throw new Error('저장에 실패했습니다.')
  const j = (await r.json()) as { config?: unknown }
  const saved = (j.config || copy) as Record<string, unknown>
  setSnapshot({
    whenLoggedOut: mergeVisibility(saved.whenLoggedOut),
    whenLoggedIn: whenLoggedInWithContact(mergeVisibility(saved.whenLoggedIn)),
  })
}

export function subscribeSiteHeaderNav(callback: () => void) {
  const onEvt = () => callback()
  window.addEventListener(EVT, onEvt)
  return () => {
    window.removeEventListener(EVT, onEvt)
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

if (typeof window !== 'undefined') void refreshSiteHeaderNavConfig()
