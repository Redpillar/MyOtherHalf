import { type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  saveAdminUiSettings,
  useAdminUiSettings,
  type AdminUiSettings,
} from '../admin/adminUiSettings'
import { useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import './admin.scss'

export function AdminSettings() {
  const token = useAdminToken()
  const prefs = useAdminUiSettings()

  const persist = async (next: AdminUiSettings) => {
    if (!token) return
    await saveAdminUiSettings(next, token)
  }

  const onToggleCompact = (e: FormEvent<HTMLInputElement>) => {
    void persist({ ...prefs, compactMemberTable: e.currentTarget.checked })
  }

  const onToggleConfirmLogout = (e: FormEvent<HTMLInputElement>) => {
    void persist({ ...prefs, confirmBeforeLogout: e.currentTarget.checked })
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 560 }}>
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">관리자 설정</h1>
            <p className="adminHint muted">
              <strong>관리자 메뉴</strong>와 <strong>메인 사이트 헤더</strong> 링크는 각 설정 페이지에서 켜고 끌 수 있습니다. 아래 옵션은 이
              서비스에 저장됩니다.
            </p>
          </div>

          {token ? (
            <div className="adminSettingsCard card" style={{ marginBottom: 16 }}>
              <h2 className="adminSettingsSectionTitle">메뉴</h2>
              <p className="adminHint muted" style={{ marginBottom: 12 }}>
                로그인·로그아웃 시 상단에 보이는 링크를 골라 저장할 수 있습니다.
              </p>
              <div className="adminSettingsBtnRow">
                <Link to="/admin/menu-settings" className="submitBtn adminLoginBtn adminSettingsBtnHalf" style={{ textDecoration: 'none' }}>
                  관리자 메뉴
                </Link>
                <Link to="/admin/site-header-nav" className="submitBtn adminLoginBtn adminSettingsBtnHalf" style={{ textDecoration: 'none' }}>
                  헤더(메인) 메뉴
                </Link>
              </div>
            </div>
          ) : null}

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <div className="adminSettingsCard card">
              <h2 className="adminSettingsSectionTitle">화면</h2>
              <label className="adminSettingsRow">
                <input type="checkbox" checked={prefs.compactMemberTable} onChange={onToggleCompact} />
                <span>회원 목록을 조밀한 표로 보기</span>
              </label>

              <h2 className="adminSettingsSectionTitle">동작</h2>
              <label className="adminSettingsRow">
                <input type="checkbox" checked={prefs.confirmBeforeLogout} onChange={onToggleConfirmLogout} />
                <span>로그아웃 전 확인 창 띄우기</span>
              </label>
            </div>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
