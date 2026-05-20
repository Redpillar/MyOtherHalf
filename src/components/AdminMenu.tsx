import { NavLink, useNavigate } from 'react-router-dom'
import { useAdminUiSettings } from '../admin/adminUiSettings'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import '../pages/admin.scss'

export function AdminMenu() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const prefs = useAdminUiSettings()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'adminMenuLink adminMenuLinkActive' : 'adminMenuLink'

  const lo = prefs.menuWhenLoggedOut
  const li = prefs.menuWhenLoggedIn

  if (!token) {
    const hasAny = lo.loginLink || lo.settingsLink
    return (
      <nav className="adminMenu" aria-label="관리자 메뉴">
        {lo.loginLink ? (
          <NavLink to="/admin" className={linkClass} end>
            관리자 로그인
          </NavLink>
        ) : null}
        {lo.settingsLink ? (
          <NavLink to="/admin/settings" className={linkClass}>
            설정
          </NavLink>
        ) : null}
        {!hasAny ? <span className="adminMenuEmptyHint">표시할 메뉴가 없습니다. URL로 직접 이동하거나 메뉴 설정에서 켜 주세요.</span> : null}
      </nav>
    )
  }

  const hasAnyLoggedIn =
    li.dashboard ||
    li.members ||
    li.managerList ||
    li.managerRegister ||
    li.inquiries ||
    li.notices ||
    li.reviews ||
    li.recommendations ||
    li.settings ||
    li.menuSettings ||
    li.logout

  return (
    <nav className="adminMenu" aria-label="관리자 메뉴">
      {li.dashboard ? (
        <NavLink to="/admin/dashboard" className={linkClass}>
          관리자 홈
        </NavLink>
      ) : null}
      {li.members ? (
        <NavLink to="/admin" className={linkClass} end>
          회원 목록
        </NavLink>
      ) : null}
      {li.managerList ? (
        <NavLink to="/admin/managers" className={linkClass}>
          매니저 목록
        </NavLink>
      ) : null}
      {li.managerRegister ? (
        <NavLink to="/admin/managers/register" className={linkClass}>
          매니저 등록
        </NavLink>
      ) : null}
      {li.inquiries ? (
        <NavLink to="/admin/inquiries" className={linkClass}>
          1:1 문의
        </NavLink>
      ) : null}
      {li.notices ? (
        <NavLink to="/admin/notices" className={linkClass}>
          공지사항
        </NavLink>
      ) : null}
      {li.reviews ? (
        <NavLink to="/admin/reviews" className={linkClass}>
          커플 후기
        </NavLink>
      ) : null}
      {li.recommendations ? (
        <NavLink to="/admin/recommendations" className={linkClass}>
          랜딩 추천 문구
        </NavLink>
      ) : null}
      {li.settings ? (
        <NavLink to="/admin/settings" className={linkClass}>
          관리자 설정
        </NavLink>
      ) : null}
      {li.menuSettings ? (
        <NavLink to="/admin/menu-settings" className={linkClass}>
          메뉴 표시 설정
        </NavLink>
      ) : null}
      {li.logout ? (
        <>
          <span className="adminMenuSpacer" aria-hidden="true" />
          <button
            type="button"
            className="adminMenuLogout"
            onClick={() => {
              clearAdminToken()
              navigate('/admin', { replace: true })
            }}
          >
            로그아웃
          </button>
        </>
      ) : null}
      {!hasAnyLoggedIn ? (
        <span className="adminMenuEmptyHint">표시할 메뉴가 없습니다. 메뉴 설정에서 켜 주세요.</span>
      ) : null}
    </nav>
  )
}
