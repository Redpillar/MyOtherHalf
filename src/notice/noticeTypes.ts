export type PublicNoticeSummary = {
  id: number
  title: string
  excerpt: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type PublicNoticeDetail = {
  id: number
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type AdminNoticeSummary = PublicNoticeSummary & {
  published: boolean
}

export type AdminNotice = PublicNoticeDetail & {
  published: boolean
}

const NOTICE_NEW_MS = 7 * 24 * 60 * 60 * 1000

export function isNoticeNew(createdAt: string | undefined): boolean {
  const created = new Date(String(createdAt || '')).getTime()
  if (!Number.isFinite(created)) return false
  return Date.now() - created <= NOTICE_NEW_MS
}
