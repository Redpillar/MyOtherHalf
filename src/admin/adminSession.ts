import { useSyncExternalStore } from 'react'

export const ADMIN_TOKEN_KEY = 'naebban_admin_token'

const EVT = 'naebban-admin-token'

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

/** CSR에서도 클라이언트 `getAdminToken`과 같아야 `useSyncExternalStore` 불일치 오류가 나지 않습니다. */
export function getAdminTokenServerSnapshot(): string | null {
  return getAdminToken()
}

export function subscribeAdminToken(callback: () => void) {
  const onEvt = () => callback()
  const onStorage = (e: StorageEvent) => {
    if (e.key === ADMIN_TOKEN_KEY || e.key === null) callback()
  }
  window.addEventListener(EVT, onEvt)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVT, onEvt)
    window.removeEventListener('storage', onStorage)
  }
}

export function setAdminToken(value: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, value)
  window.dispatchEvent(new Event(EVT))
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  window.dispatchEvent(new Event(EVT))
}

export function useAdminToken(): string | null {
  return useSyncExternalStore(subscribeAdminToken, getAdminToken, getAdminTokenServerSnapshot)
}
