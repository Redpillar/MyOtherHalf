import { type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { siteNavItems, type SiteNavId } from '../config/nav'
import { useAdminToken } from '../admin/adminSession'
import { setMemberSession, useMemberSession } from '../lib/memberSession'
import {
  saveSiteHeaderNavConfig,
  useSiteHeaderNavConfig,
  type SiteHeaderNavConfig,
  type SiteHeaderNavVisibility,
} from '../lib/siteHeaderNavSettings'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import './admin.scss'

function allTrue(): SiteHeaderNavVisibility {
  const o = {} as SiteHeaderNavVisibility
  for (const item of siteNavItems) {
    o[item.id] = true
  }
  return o
}

export function AdminSiteHeaderNavSettings() {
  const token = useAdminToken()
  const member = useMemberSession()
  const cfg = useSiteHeaderNavConfig()

  const persist = (next: SiteHeaderNavConfig) => {
    saveSiteHeaderNavConfig(next)
  }

  const onToggleOut = (id: SiteNavId) => (e: FormEvent<HTMLInputElement>) => {
    persist({ ...cfg, whenLoggedOut: { ...cfg.whenLoggedOut, [id]: e.currentTarget.checked } })
  }

  const onToggleIn = (id: SiteNavId) => (e: FormEvent<HTMLInputElement>) => {
    persist({ ...cfg, whenLoggedIn: { ...cfg.whenLoggedIn, [id]: e.currentTarget.checked } })
  }

  const onResetAll = () => {
    const t = allTrue()
    persist({ whenLoggedOut: { ...t }, whenLoggedIn: { ...t } })
  }

  const visOut = cfg.whenLoggedOut
  const visIn = cfg.whenLoggedIn

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 640 }}>
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">헤더 메뉴 표시</h1>
            <p className="adminHint muted">
              메인 사이트 상단 가운데 링크입니다. <strong>회원 로그인 전·후</strong>에 각각 어떤 항목을 보일지 체크합니다. (로그인은{' '}
              <Link to="/login">로그인 페이지</Link>에서 제출 시 데모 세션이 켜집니다.) 이 브라우저 <code>localStorage</code>에만
              저장되며, 위 헤더에 바로 반영됩니다.
            </p>
          </div>

          <div className="adminSettingsCard card" style={{ marginBottom: 16 }}>
            <h2 className="adminSettingsSectionTitle">미리보기 (회원 세션)</h2>
            <p className="adminMenuSettingsHint muted" style={{ marginTop: 0 }}>
              지금 헤더는 <strong>{member ? '로그인 상태' : '로그아웃 상태'}</strong> 설정을 씁니다. 전환은 아래 버튼으로만 테스트할 수
              있습니다.
            </p>
            <div className="adminSettingsBtnRow">
              <button
                type="button"
                className={`submitBtn adminLoginBtn adminSettingsBtnHalf${!member ? ' adminPreviewBtnActive' : ''}`}
                onClick={() => setMemberSession(false)}
              >
                미리보기: 로그아웃
              </button>
              <button
                type="button"
                className={`submitBtn adminLoginBtn adminSettingsBtnHalf${member ? ' adminPreviewBtnActive' : ''}`}
                onClick={() => setMemberSession(true)}
              >
                미리보기: 로그인
              </button>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              관리자 설정을 저장하려면 로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <>
              <div className="adminSettingsCard card">
                <h2 className="adminSettingsSectionTitle">로그아웃 상태 (회원 미로그인)</h2>
                <p className="adminMenuSettingsHint muted">로그인·회원가입이 보일 때의 가운데 메뉴입니다.</p>
                {siteNavItems.map((item) => (
                  <label key={`out-${item.id}`} className="adminSettingsRow">
                    <input type="checkbox" checked={visOut[item.id]} onChange={onToggleOut(item.id)} />
                    <span>
                      <strong>{item.label}</strong>
                      <span className="adminSiteNavMeta"> ({item.href})</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="adminSettingsCard card" style={{ marginTop: 16 }}>
                <h2 className="adminSettingsSectionTitle">로그인 상태 (회원 로그인 후)</h2>
                <p className="adminMenuSettingsHint muted">
                  헤더 오른쪽이 로그아웃일 때의 가운데 메뉴입니다. <strong>1:1문의</strong>는 로그인 후 항상 표시됩니다.
                </p>
                {siteNavItems.map((item) => (
                  <label key={`in-${item.id}`} className="adminSettingsRow">
                    <input
                      type="checkbox"
                      checked={visIn[item.id]}
                      disabled={item.id === 'contact'}
                      onChange={onToggleIn(item.id)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <span className="adminSiteNavMeta"> ({item.href})</span>
                    </span>
                  </label>
                ))}
              </div>

              <p className="adminMenuSettingsResetWrap">
                <button type="button" className="btnGhost adminMenuSettingsReset" onClick={onResetAll}>
                  로그인·로그아웃 모두 전체 켜기
                </button>
              </p>
            </>
          )}

          <p className="adminBack">
            <Link to="/admin/settings">← 관리자 설정</Link>
            {' · '}
            <Link to="/">메인</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
