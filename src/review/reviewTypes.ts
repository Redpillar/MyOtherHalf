export type ReviewTone = 'sky' | 'rose' | 'mint' | 'gold' | 'lavender'

export const REVIEW_TONE_OPTIONS: ReadonlyArray<{ value: ReviewTone; label: string }> = [
  { value: 'sky', label: '하늘' },
  { value: 'rose', label: '로즈' },
  { value: 'mint', label: '민트' },
  { value: 'gold', label: '골드' },
  { value: 'lavender', label: '라벤더' },
]

export type PublicReviewSummary = {
  id: number
  title: string
  subtitle: string
  summary: string
  previewTone: ReviewTone
  hasPhoto: boolean
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type PublicReviewDetail = PublicReviewSummary & {
  body: string
}

export type AdminReviewSummary = PublicReviewSummary & {
  published: boolean
}

export type AdminReview = PublicReviewDetail & {
  published: boolean
}
