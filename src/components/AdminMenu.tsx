import { NavLink, useNavigate } from 'react-router-dom'
import { loadAdminUiSettings, useAdminUiSettings } from '../admin/adminUiSettings'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { apiFetch } from '../lib/apiFetch'
import '../pages/admin.scss'

export function AdminMenu() {
  const token = useAdminToken()
  const prefs = useAdminUiSettings()
  const navigate = useNavigate()

  const onLogout = async () => {
    const s = loadAdminUiSettings()
    if (s.confirmBeforeLogout) {
      if (!window.confirm('로그아웃할까요?')) return
    }
    const t = token
    if (t) {
      try {
        await apiFetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` },
        })
      } catch {
        /* ignore */
      }
    }
    clearAdminToken()
    navigate('/admin')
  }

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

  const leftAny =
    li.dashboard ||
    li.members ||
    li.managerList ||
    li.managerRegister ||
    li.inquiries ||
    li.recommendations ||
    li.settings ||
    li.menuSettings

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
        <NavLink to="/admin/managers" className={linkClass} end>
          매니저 목록
        </NavLink>
      ) : null}
      {li.managerRegister ? (
        <NavLink to="/admin/managers/register" className={linkClass}>
          매니저 등록
        </NavLink>
      ) : null}
      {li.inquiries ? (
        <NavLink to="/admin/inquiries" className={linkClass} end>
          1:1 문의
        </NavLink>
      ) : null}
      {li.recommendations ? (
        <NavLink to="/admin/recommendations" className={linkClass} end>
          랜딩 추천
        </NavLink>
      ) : null}
      {li.settings ? (
        <NavLink to="/admin/settings" className={linkClass}>
          설정
        </NavLink>
      ) : null}
      {li.menuSettings ? (
        <NavLink to="/admin/menu-settings" className={linkClass}>
          메뉴 설정
        </NavLink>
      ) : null}
      {leftAny && li.logout ? <span className="adminMenuSpacer" aria-hidden /> : null}
      {li.logout ? (
        <button type="button" className="adminMenuLogout" onClick={() => void onLogout()}>
          로그아웃
        </button>
      ) : null}
    </nav>
  )
}
