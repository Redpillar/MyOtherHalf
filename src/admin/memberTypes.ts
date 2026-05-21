import type { ConsultationStatus } from '../consult/consultTypes'

export type { ConsultationStatus }

export type AdminMember = {
  id: number
  userId: string
  name: string
  phone: string
  birth: string
  gender: string
  height: string
  weight: string
  job: string
  region1: string
  region2: string
  education: string
  mbti: string
  smoke: string
  drink: string
  car: string
  appeal: string
  obligationAgreed: boolean
  createdAt: string
  /** ISO 8601 — 최근 회원 로그인 시각 */
  lastLoginAt?: string | null
  photos?: string[]
  photoCount?: number
  locationLat?: number | null
  locationLng?: number | null
  locationAccuracyM?: number | null
  locationUpdatedAt?: string
  hasLocation?: boolean
  consultationStatus?: ConsultationStatus
  consultationRequestedAt?: string
  /** 관리자 전용 내부 메모 */
  adminMemo?: string
}

export type AdminNearbyMember = {
  id: number
  name: string
  gender: string
  age: number | null
  height: string
  job: string
  region1: string
  region2: string
  photoCount: number
  locationLat: number
  locationLng: number
  locationAccuracyM: number | null
  locationUpdatedAt: string
  distanceKm: number
}
