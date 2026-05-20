export type LandingKpiStats = {
  cumulativeMembers: number
  cumulativeCouples: number
  inProgress: number
  successRate: number
}

export const DEFAULT_LANDING_KPI: LandingKpiStats = {
  cumulativeMembers: 47758,
  cumulativeCouples: 55572,
  inProgress: 74,
  successRate: 98,
}

export const LANDING_KPI_LABELS = ['누적 가입자', '누적 커플', '진행중', '성사율'] as const

export function formatLandingKpiValue(key: keyof LandingKpiStats, value: number): string {
  if (key === 'successRate') return `${value}%`
  if (key === 'inProgress') return `${value.toLocaleString('ko-KR')}+`
  return `${value.toLocaleString('ko-KR')}+`
}

export function landingKpiEntries(stats: LandingKpiStats) {
  return [
    { key: 'cumulativeMembers' as const, label: LANDING_KPI_LABELS[0], value: stats.cumulativeMembers },
    { key: 'cumulativeCouples' as const, label: LANDING_KPI_LABELS[1], value: stats.cumulativeCouples },
    { key: 'inProgress' as const, label: LANDING_KPI_LABELS[2], value: stats.inProgress },
    { key: 'successRate' as const, label: LANDING_KPI_LABELS[3], value: stats.successRate },
  ]
}
