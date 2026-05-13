export type RecommendTone = 'gray' | 'blue' | 'pink' | 'purple' | 'slate'

export type RecommendationItem = {
  id: number
  quote: string
  tone: RecommendTone
}
