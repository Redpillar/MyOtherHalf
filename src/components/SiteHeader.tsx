import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { siteNavItems } from '../config/nav'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { setMemberSession, useMemberSession } from '../lib/memberSession'
import { useSiteHeaderNavConfig } from '../lib/siteHeaderNavSettings'
import '../pages/landing.scss'

const adminNavItems: { id: string; to: string; label: string }[] = [
  { id: 'admin-members', to: '/admin', label: '회원 목록' },
  { id: 'admin-managers', to: '/admin/managers', label: '매니저 목록' },
  { id: 'admin-inquiries', to: '/admin/inquiries', label: '1:1 문의' },
  { id: 'admin-notices', to: '/admin/notices', label: '공지사항' },
  { id: 'admin-reviews', to: '/admin/reviews', label: '커플 후기' },
  { id: 'admin-recommendations', to: '/admin/recommendations', label: '랜딩 추천 문구' },
  { id: 'admin-landing-kpi', to: '/admin/landing-kpi', label: '메인 KPI' },
  { id: 'admin-landing-member-stats', to: '/admin/landing-member-stats', label: '메인 회원 현황' },
  { id: 'admin-menu-settings', to: '/admin/menu-settings', label: '메뉴 표시 설정' },
  { id: 'admin-site-header-nav', to: '/admin/site-header-nav', label: '헤더(메인) 메뉴' },
]

export function SiteHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const member = useMemberSession()
  const adminToken = useAdminToken()
  const navConfig = useSiteHeaderNavConfig()
  const navVis = member ? navConfig.whenLoggedIn : navConfig.whenLoggedOut
  const visibleItems = siteNavItems.filter((item) => navVis[item.id])
  const isAdmin = Boolean(adminToken)
  const [newInquiryCount, setNewInquiryCount] = useState<number>(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const adminInquiryLink = useMemo(() => adminNavItems.find((x) => x.id === 'admin-inquiries')?.to, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    if (!isAdmin || !adminToken) {
      setNewInquiryCount(0)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    ;(async () => {
      try {
        const r = await fetch('/api/admin/inquiries', {
          headers: { Authorization: `Bearer ${adminToken}` },
          signal: controller.signal,
        })
        if (!r.ok) return
        const j = (await r.json()) as { inquiries?: Array<{ hasReply?: boolean; status?: string }> }
        const rows = Array.isArray(j.inquiries) ? j.inquiries : []
        const count = rows.filter((x) => x?.status === 'new').length
        if (!cancelled) setNewInquiryCount(count)
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isAdmin, adminToken])

  const navLinks: ReactNode = isAdmin ? (
    adminNavItems.map((item) => (
      <Link key={item.id} className="navLink" to={item.to} onClick={() => setMenuOpen(false)}>
        {item.label}
        {item.to === adminInquiryLink && newInquiryCount > 0 ? (
          <span className="navBadge" aria-label={`신규 문의 ${newInquiryCount}건`}>
            N
          </span>
        ) : null}
      </Link>
    ))
  ) : (
    visibleItems.map((item) =>
      item.href.startsWith('/') && !item.href.includes('#') ? (
        <Link
          key={item.id}
          className="navLink"
          to={item.id === 'contact' ? (member ? '/inquiry' : '/inquiry/new') : item.href}
          onClick={() => setMenuOpen(false)}
        >
          {item.label}
        </Link>
      ) : (
        <a key={item.id} className="navLink" href={item.href} onClick={() => setMenuOpen(false)}>
          {item.label}
        </a>
      ),
    )
  )

  const authLinks: ReactNode = isAdmin ? (
    <button
      type="button"
      className="navLink siteHeaderLogoutBtn"
      onClick={() => {
        clearAdminToken()
        setMenuOpen(false)
        navigate('/admin', { replace: true })
      }}
    >
      관리자 로그아웃
    </button>
  ) : member ? (
    <>
      <button
        type="button"
        className="navLink siteHeaderLogoutBtn"
        onClick={() => {
          setMemberSession(false)
          setMenuOpen(false)
          navigate('/login', { replace: true })
        }}
      >
        로그아웃
      </button>
      <Link className="navLink" to="/consult" onClick={() => setMenuOpen(false)}>
        마이페이지
      </Link>
    </>
  ) : (
    <>
      <Link className="navLink" to="/login" onClick={() => setMenuOpen(false)}>
        로그인
      </Link>
      <Link className="navLink" to="/join" onClick={() => setMenuOpen(false)}>
        회원가입
      </Link>
    </>
  )

  return (
    <>
      <header className={`topBar${menuOpen ? ' topBar--menuOpen' : ''}`}>
        <div className="container topBarInner">
          <Link to={isAdmin ? '/admin/dashboard' : '/'} className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
            <BrandLogo />
          </Link>

          <button
            type="button"
            className="topBarMenuBtn"
            aria-expanded={menuOpen}
            aria-controls="topBarMobileMenu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="topBarMenuBtnIcon" aria-hidden="true" />
            <span className="srOnly">{menuOpen ? '메뉴 닫기' : '메뉴 열기'}</span>
          </button>

          <nav className="nav topBarNav--desktop" aria-label="메인 메뉴">
            {navLinks}
          </nav>

          <div className="auth topBarAuth--desktop">{authLinks}</div>
        </div>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="topBarMenuBackdrop"
              aria-label="메뉴 닫기"
              onClick={() => setMenuOpen(false)}
            />
            <div id="topBarMobileMenu" className="topBarMobileMenu">
              <nav className="topBarMobileNav" aria-label="모바일 메뉴">
                {navLinks}
              </nav>
              <div className="topBarMobileAuth">{authLinks}</div>
            </div>
          </>
        ) : null}
      </header>
      <div className="topBarSpacer" aria-hidden="true" />
    </>
  )
}
