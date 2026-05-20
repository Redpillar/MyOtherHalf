import { useSyncExternalStore } from 'react'

const SESSION_KEY = 'demo_member_logged_in'
const PROFILE_KEY = 'demo_member_profile'
const EVT = 'demo-member-session'

let cachedProfileRaw: string | null | undefined
let cachedProfileValue: MemberProfile | null = null

export type MemberProfile = {
  userId: string
}

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function getMemberSession(): boolean {
  return readSession()
}

export function getMemberSessionServerSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return getMemberSession()
}

export function getMemberProfile(): MemberProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY)
    if (raw === cachedProfileRaw) return cachedProfileValue
    if (!raw) {
      cachedProfileRaw = null
      cachedProfileValue = null
      return null
    }
    const o = JSON.parse(raw) as { userId?: unknown }
    if (!o || typeof o.userId !== 'string' || !o.userId.trim()) {
      cachedProfileRaw = raw
      cachedProfileValue = null
      return null
    }
    cachedProfileRaw = raw
    cachedProfileValue = { userId: o.userId.trim() }
    return cachedProfileValue
  } catch {
    cachedProfileRaw = null
    cachedProfileValue = null
    return null
  }
}

function subscribe(callback: () => void) {
  const onEvt = () => callback()
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY || e.key === PROFILE_KEY || e.key === null) callback()
  }
  window.addEventListener(EVT, onEvt)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVT, onEvt)
    window.removeEventListener('storage', onStorage)
  }
}

function emit() {
  window.dispatchEvent(new Event(EVT))
}

export function setMemberProfile(profile: MemberProfile | null) {
  try {
    if (!profile || !profile.userId.trim()) {
      sessionStorage.removeItem(PROFILE_KEY)
    } else {
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify({ userId: profile.userId.trim() }))
    }
  } catch {
    /* ignore */
  }
  emit()
}

export function setMemberSession(loggedIn: boolean) {
  try {
    if (loggedIn) sessionStorage.setItem(SESSION_KEY, '1')
    else {
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(PROFILE_KEY)
    }
  } catch {
    /* ignore */
  }
  emit()
}

export function useMemberSession(): boolean {
  return useSyncExternalStore(subscribe, getMemberSession, getMemberSessionServerSnapshot)
}

export function useMemberProfile(): MemberProfile | null {
  return useSyncExternalStore(
    subscribe,
    getMemberProfile,
    () => (typeof window === 'undefined' ? null : getMemberProfile()),
  )
}
