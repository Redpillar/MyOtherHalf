export type ConsultationStatus = 'none' | 'requested' | 'contacted' | 'in_progress' | 'completed'

export type MemberConsultation = {
  consultationStatus: ConsultationStatus
  consultationRequestedAt: string
}

export const CONSULTATION_TIMELINE = [
  { id: 'submitted', label: '상담 접수', desc: '상담 신청이 접수되었습니다.' },
  { id: 'review', label: '매니저 검토 · 연락 대기', desc: '담당 매니저가 프로필을 검토 중입니다.' },
  { id: 'contact', label: '카카오톡 상담', desc: '등록하신 번호로 카카오톡 연락을 드립니다.' },
  { id: 'matching', label: '맞춤 매칭', desc: '상담 후 회원님께 맞는 매칭을 진행합니다.' },
] as const

export function consultationTimelineIndex(status: ConsultationStatus): number {
  if (status === 'none') return -1
  if (status === 'requested') return 1
  if (status === 'contacted') return 2
  if (status === 'in_progress') return 3
  if (status === 'completed') return 3
  return -1
}

export const ADMIN_CONSULTATION_STATUS_OPTIONS: { value: ConsultationStatus; label: string }[] = [
  { value: 'none', label: '미신청' },
  { value: 'requested', label: '매니저 검토 · 연락 대기' },
  { value: 'contacted', label: '카카오톡 상담' },
  { value: 'in_progress', label: '맞춤 매칭' },
  { value: 'completed', label: '상담 완료' },
]

export function adminConsultationStatusLabel(status: ConsultationStatus | string | undefined): string {
  const hit = ADMIN_CONSULTATION_STATUS_OPTIONS.find((x) => x.value === status)
  return hit?.label ?? consultationStatusLabel(status as ConsultationStatus)
}

export function consultationStatusLabel(status: ConsultationStatus): string {
  if (status === 'none') return '미신청'
  if (status === 'requested') return '매니저 검토 · 연락 대기'
  if (status === 'contacted') return '카카오톡 상담'
  if (status === 'in_progress') return '맞춤 매칭'
  if (status === 'completed') return '상담 완료'
  return status
}
