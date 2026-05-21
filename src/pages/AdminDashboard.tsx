import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useAdminToken } from '../admin/adminSession'
import { SiteHeader } from '../components/SiteHeader'
import './admin.scss'

const dashboardTiles: { to: string; label: string; hint: string }[] = [
  { to: '/admin', label: '회원 목록', hint: '가입 회원 조회 및 상세' },
  { to: '/admin/managers', label: '매니저 목록', hint: '소개 매니저 프로필 관리' },
  { to: '/admin/inquiries', label: '1:1 문의', hint: '고객 문의 답변·상태' },
  { to: '/admin/notices', label: '공지사항', hint: '공지 등록·공개 여부 관리' },
  { to: '/admin/reviews', label: '커플 후기', hint: '후기 등록·공개 여부 관리' },
  { to: '/admin/recommendations', label: '랜딩 추천 문구', hint: '메인 추천 카드 문구' },
  { to: '/admin/landing-kpi', label: '메인 KPI', hint: '메인 KPI 바 수치 관리' },
  { to: '/admin/landing-member-stats', label: '메인 회원 현황', hint: '남·여 회원 수·성비 관리' },
  { to: '/admin/menu-settings', label: '메뉴 표시 설정', hint: '관리자 상단 메뉴 구성' },
  { to: '/admin/site-header-nav', label: '헤더(메인) 메뉴', hint: '사이트 상단 링크 노출' },
]

export function AdminDashboard() {
  const token = useAdminToken()
  const [newInquiryCount, setNewInquiryCount] = useState<number>(0)
  const [memberCount, setMemberCount] = useState<number>(0)

  const loadBadge = useCallback(async () => {
    const t = token
    if (!t) return
    try {
      const [inqR, membersR] = await Promise.all([
        fetch('/api/admin/inquiries', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/admin/members', { headers: { Authorization: `Bearer ${t}` } }),
      ])

      if (inqR.ok) {
        const j = (await inqR.json()) as { inquiries?: Array<{ status?: string }> }
        const rows = Array.isArray(j.inquiries) ? j.inquiries : []
        setNewInquiryCount(rows.filter((x) => x?.status === 'new').length)
      }

      if (membersR.ok) {
        const j = (await membersR.json()) as { members?: unknown[] }
        const rows = Array.isArray(j.members) ? j.members : []
        setMemberCount(rows.length)
      }
    } catch {
      // ignore
    }
  }, [token])

  useEffect(() => {
    void loadBadge()
  }, [loadBadge])

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 900 }}>
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
                    <span className="adminDashboardCardTitle">
                      {t.label}
                      {t.to === '/admin/inquiries' && newInquiryCount > 0 ? (
                        <span className="adminDashboardBadge" aria-label={`신규 문의 ${newInquiryCount}건`}>
                          NEW
                        </span>
                      ) : null}
                      {t.to === '/admin' && memberCount > 0 ? (
                        <span className="adminDashboardCount" aria-label={`총 회원 ${memberCount}명`}>
                          (총 {memberCount}명)
                        </span>
                      ) : null}
                    </span>
                    <span className="adminDashboardCardHint muted">
                      {t.hint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
