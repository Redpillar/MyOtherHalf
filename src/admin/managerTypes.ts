export type PublicManager = {
  id: number
  name: string
  intro: string
  tags: string[]
  consultMethod: string
  successCount: number
  hasPhoto: boolean
}

/** 관리자 매니저 목록·수정 */
export type AdminManagerRow = PublicManager & {
  createdAt: string
}

export function parseManagerTags(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim().replace(/^#/, '')).filter(Boolean).slice(0, 8)
  }
  return String(raw || '')
    .split(/[,，、]/)
    .map((s) => s.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8)
}

export function formatManagerTagsInput(tags: string[] | undefined): string {
  return parseManagerTags(tags?.join(', ')).join(', ')
}
