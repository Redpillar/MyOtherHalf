/** 관리자 화면용 회원 일시 표시 */
export function formatMemberDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ko-KR')
}
