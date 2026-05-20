import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  saveAdminUiSettings,
  useAdminUiSettings,
  type AdminMenuWhenLoggedIn,
  type AdminMenuWhenLoggedOut,
  type AdminUiSettings,
} from '../admin/adminUiSettings'
import { useAdminToken } from '../admin/adminSession'
import { SiteHeader } from '../components/SiteHeader'
import './admin.scss'

function patchLoggedOut(prev: AdminUiSettings, patch: Partial<AdminMenuWhenLoggedOut>): AdminUiSettings {
  return {
    ...prev,
    menuWhenLoggedOut: { ...prev.menuWhenLoggedOut, ...patch },
  }
}

function patchLoggedIn(prev: AdminUiSettings, patch: Partial<AdminMenuWhenLoggedIn>): AdminUiSettings {
  return {
    ...prev,
    menuWhenLoggedIn: { ...prev.menuWhenLoggedIn, ...patch },
  }
}

export function AdminMenuSettings() {
  const token = useAdminToken()
  const prefs = useAdminUiSettings()
  const [draft, setDraft] = useState<AdminUiSettings>(prefs)

  useEffect(() => {
    setDraft(prefs)
  }, [prefs])

  const lo = draft.menuWhenLoggedOut
  const li = draft.menuWhenLoggedIn

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(prefs), [draft, prefs])

  const persist = async () => {
    if (!token) return
    await saveAdminUiSettings(draft, token)
    window.alert('저장되었습니다.')
  }

  const onLo = (key: keyof AdminMenuWhenLoggedOut) => (e: FormEvent<HTMLInputElement>) => {
    setDraft((prev) => patchLoggedOut(prev, { [key]: e.currentTarget.checked }))
  }

  const onLi = (key: keyof AdminMenuWhenLoggedIn) => (e: FormEvent<HTMLInputElement>) => {
    setDraft((prev) => patchLoggedIn(prev, { [key]: e.currentTarget.checked }))
  }

  const onResetMenus = () => {
    setDraft((prev) => ({
      ...prev,
      menuWhenLoggedOut: { loginLink: true, settingsLink: false },
      menuWhenLoggedIn: {
        dashboard: true,
        members: true,
        managerList: true,
        managerRegister: true,
        inquiries: true,
        notices: true,
        reviews: true,
        recommendations: true,
        settings: true,
        menuSettings: true,
        logout: true,
      },
    }))
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 640 }}>
          <div className="adminHead">
            <h1 className="adminTitle">메뉴 표시 설정</h1>
            <p className="adminHint muted">
              로그인 여부에 따라 상단 관리자 메뉴에 어떤 항목을 보일지 정합니다. 이 브라우저의 <code>localStorage</code>에만
              저장됩니다.
            </p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <>
              <div className="adminSettingsCard card">
                <h2 className="adminSettingsSectionTitle">로그아웃 상태 메뉴</h2>
                <p className="adminMenuSettingsHint muted">비로그인일 때 상단 바에 표시할 링크입니다.</p>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={lo.loginLink} onChange={onLo('loginLink')} />
                  <span>관리자 로그인 (/admin)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={lo.settingsLink} onChange={onLo('settingsLink')} />
                  <span>설정 (/admin/settings) — 비로그인 시 안내만 보입니다.</span>
                </label>
              </div>

              <div className="adminSettingsCard card" style={{ marginTop: 16 }}>
                <h2 className="adminSettingsSectionTitle">로그인 상태 메뉴</h2>
                <p className="adminMenuSettingsHint muted">로그인 후 상단 바에 표시할 항목입니다.</p>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.dashboard} onChange={onLi('dashboard')} />
                  <span>관리자 홈 (/admin/dashboard)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.members} onChange={onLi('members')} />
                  <span>회원 목록</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.managerList} onChange={onLi('managerList')} />
                  <span>매니저 목록</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.managerRegister} onChange={onLi('managerRegister')} />
                  <span>매니저 등록</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.inquiries} onChange={onLi('inquiries')} />
                  <span>1:1 문의</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.notices} onChange={onLi('notices')} />
                  <span>공지사항 관리 (/admin/notices)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.reviews} onChange={onLi('reviews')} />
                  <span>커플 후기 관리 (/admin/reviews)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.recommendations} onChange={onLi('recommendations')} />
                  <span>랜딩 추천 문구 (/admin/recommendations)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.settings} onChange={onLi('settings')} />
                  <span>설정 (화면·로그아웃 확인 등)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.menuSettings} onChange={onLi('menuSettings')} />
                  <span>메뉴 설정 (이 페이지 링크)</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={li.logout} onChange={onLi('logout')} />
                  <span>로그아웃 버튼</span>
                </label>
              </div>

              <p className="adminMenuSettingsResetWrap">
                <button type="button" className="btnGhost adminMenuSettingsReset" onClick={onResetMenus}>
                  메뉴 표시 기본값으로 되돌리기
                </button>
                <button
                  type="button"
                  className="submitBtn adminLoginBtn"
                  style={{ marginLeft: 10 }}
                  onClick={() => void persist()}
                  disabled={!dirty}
                >
                  저장
                </button>
              </p>
            </>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <span>메뉴 표시 설정</span>
          </p>
        </div>
      </main>
    </div>
  )
}
