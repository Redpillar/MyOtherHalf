import { Link } from 'react-router-dom'
import { useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import './admin.scss'

const dashboardTiles: { to: string; label: string; hint: string }[] = [
  { to: '/admin', label: '회원 목록', hint: '가입 회원 조회 및 상세' },
  { to: '/admin/managers', label: '매니저 목록', hint: '소개 매니저 프로필 관리' },
  { to: '/admin/managers/register', label: '매니저 등록', hint: '신규 매니저 등록' },
  { to: '/admin/inquiries', label: '1:1 문의', hint: '고객 문의 답변·상태' },
  { to: '/admin/recommendations', label: '랜딩 추천 문구', hint: '메인 추천 카드 문구' },
  { to: '/admin/settings', label: '관리자 설정', hint: '화면·로그아웃 옵션' },
  { to: '/admin/menu-settings', label: '메뉴 표시 설정', hint: '관리자 상단 메뉴 구성' },
  { to: '/admin/site-header-nav', label: '헤더(메인) 메뉴', hint: '사이트 상단 링크 노출' },
]

export function AdminDashboard() {
  const token = useAdminToken()

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 900 }}>
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">관리자 홈</h1>
            <p className="adminHint muted">자주 쓰는 관리 메뉴로 바로 이동할 수 있습니다.</p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <ul className="adminDashboardGrid">
              {dashboardTiles.map((t) => (
                <li key={t.to}>
                  <Link to={t.to} className="adminDashboardCard card">
                    <span className="adminDashboardCardTitle">{t.label}</span>
                    <span className="adminDashboardCardHint muted">{t.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="adminBack">
            <Link to="/">← 메인 사이트</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
