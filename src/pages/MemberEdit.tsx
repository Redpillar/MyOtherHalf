import { Link, Navigate } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { useMemberSession } from '../lib/memberSession'
import './signup.scss'

export function MemberEdit() {
  const member = useMemberSession()

  if (!member) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="loginPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner" style={{ maxWidth: 520 }}>
          <h1 className="signupTitle">회원 정보 수정</h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.55, color: 'rgba(15,23,42,0.55)' }}>
            데모 화면입니다. 실제 수정 API 연동 전까지는 여기서 안내와 링크만 제공합니다.
          </p>
          <div className="signupForm" style={{ padding: '20px 0' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'rgba(15,23,42,0.78)' }}>
              가입 시 입력한 정보를 바꾸려면 추후 마이페이지 폼이 이 자리에 연결됩니다.
            </p>
          </div>
          <p style={{ marginTop: 24, fontSize: 14 }}>
            <Link to="/" className="navLink" style={{ fontWeight: 800 }}>
              ← 메인으로
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
