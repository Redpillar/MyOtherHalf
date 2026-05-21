export type LandingMemberStats = {
  maleMembers: number
  femaleMembers: number
}

export const DEFAULT_LANDING_MEMBER_STATS: LandingMemberStats = {
  maleMembers: 35430,
  femaleMembers: 33490,
}

export function formatMemberCount(n: number): string {
  return `${Math.max(0, Math.floor(n)).toLocaleString('ko-KR')}명`
}

/** 메인 BIG DATA 블록 성비 표시 (10 단위로 단순화, 예: 5 : 5) */
export function formatGenderRatio(male: number, female: number): string {
  const m = Math.max(0, Math.floor(male))
  const f = Math.max(0, Math.floor(female))
  const sum = m + f
  if (sum === 0) return '—'

  let maleUnits = Math.round((m / sum) * 10)
  let femaleUnits = 10 - maleUnits
  if (maleUnits < 1 && m > 0) {
    maleUnits = 1
    femaleUnits = 9
  }
  if (femaleUnits < 1 && f > 0) {
    femaleUnits = 1
    maleUnits = 9
  }
  return `${maleUnits} : ${femaleUnits}`
}
