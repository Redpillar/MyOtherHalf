/** 로그인 회원 문의 API에 붙이는 쿼리 (?memberUserId=…). */
export function inquiryMemberQuery(member: boolean, userId: string | undefined | null): string {
  if (!member) return ''
  const u = String(userId || '').trim()
  if (!u) return ''
  return `?memberUserId=${encodeURIComponent(u)}`
}
