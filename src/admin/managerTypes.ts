export type PublicManager = {
  id: number
  name: string
  ratingStars: number
  successCount: number
  reviewCount: number
  hasPhoto: boolean
}

/** 관리자 매니저 목록·수정 */
export type AdminManagerRow = PublicManager & {
  createdAt: string
}
