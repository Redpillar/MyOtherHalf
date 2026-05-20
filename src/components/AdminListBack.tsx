import { useNavigate } from 'react-router-dom'

type AdminListBackProps = {
  to: string
  label: string
}

/** 관리자 상세·등록·수정 화면 상단 — 목록(또는 상위)으로 돌아가기 */
export function AdminListBack({ to, label }: AdminListBackProps) {
  const navigate = useNavigate()
  return (
    <button type="button" className="adminDetailBackBtn" onClick={() => navigate(to)}>
      ← {label}
    </button>
  )
}
