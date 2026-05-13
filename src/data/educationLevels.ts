/** 최종학력 선택지 (저장값 = 표시문구) */
export const EDUCATION_OPTIONS = [
  '초등학교 졸업',
  '중학교 졸업',
  '고등학교 졸업',
  '대학교 재학',
  '대학교 졸업',
  '대학원 재학',
  '대학원 졸업',
] as const

export type EducationOption = (typeof EDUCATION_OPTIONS)[number]

export function isKnownEducation(value: string): boolean {
  return (EDUCATION_OPTIONS as readonly string[]).includes(value)
}
