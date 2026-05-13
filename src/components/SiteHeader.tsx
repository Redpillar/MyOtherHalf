import { Link, useNavigate } from 'react-router-dom'
import { siteNavItems } from '../config/nav'
import { setMemberSession, useMemberSession } from '../lib/memberSession'
import { useSiteHeaderNavConfig } from '../lib/siteHeaderNavSettings'
import '../pages/landing.scss'

export function SiteHeader() {
  const navigate = useNavigate()
  const member = useMemberSession()
  const navConfig = useSiteHeaderNavConfig()
  const navVis = member ? navConfig.whenLoggedIn : navConfig.whenLoggedOut
  const visibleItems = siteNavItems.filter((item) => navVis[item.id])

  return (
    <>
      <header className="topBar">
        <div className="container topBarInner">
          <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="brandMark" aria-hidden="true" />
            <span className="brandName">내반쪽</span>
          </Link>

          <nav className="nav" aria-label="메인 메뉴">
            {visibleItems.map((item) =>
              item.href.startsWith('/') && !item.href.includes('#') ? (
                <Link
                  key={item.id}
                  className="navLink"
                  to={item.id === 'contact' ? (member ? '/inquiry' : '/inquiry/new') : item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <a key={item.id} className="navLink" href={item.href}>
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="auth">
            {member ? (
              <>
                <button
                  type="button"
                  className="navLink siteHeaderLogoutBtn"
                  onClick={() => {
                    setMemberSession(false)
                    navigate('/login', { replace: true })
                  }}
                >
                  로그아웃
                </button>
                <Link className="navLink" to="/me/edit">
                  회원 수정
                </Link>
              </>
            ) : (
              <>
                <Link className="navLink" to="/login">
                  로그인
                </Link>
                <Link className="navLink" to="/join">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="topBarSpacer" aria-hidden="true" />
    </>
  )
}
