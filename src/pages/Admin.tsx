import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminMember } from '../admin/memberTypes'
import { clearAdminToken, setAdminToken, useAdminToken } from '../admin/adminSession'
import { useAdminUiSettings } from '../admin/adminUiSettings'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'

export function Admin() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const uiSettings = useAdminUiSettings()
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [members, setMembers] = useState<AdminMember[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchMembers = useCallback(async (t: string) => {
    setLoading(true)
    setListError(null)
    try {
      const r = await apiFetch('/api/admin/members', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ members?: AdminMember[]; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setListError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '목록을 불러오지 못했습니다.')
      setMembers(j.members || [])
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'API 서버 연결을 확인하세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) void fetchMembers(token)
  }, [token, fetchMembers])

  const onLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    try {
      const r = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const j = await readJsonResponse<{ token?: string; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '로그인에 실패했습니다.')
      if (!j.token) throw new Error('토큰이 없습니다.')
      setAdminToken(j.token)
      setPassword('')
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : '오류')
    }
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">관리자 · 회원 조회</h1>
            <p className="adminHint muted">
              기본 비밀번호는 환경변수 <code>ADMIN_PASSWORD</code>로 바꿀 수 있습니다. (미설정 시{' '}
              <code>admin123</code>)
            </p>
          </div>

          {!token ? (
            <form className="adminLoginCard card" onSubmit={onLogin}>
              <label className="adminLabel" htmlFor="adminPw">
                관리자 비밀번호
              </label>
              <input
                id="adminPw"
                type="password"
                className="adminPwInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                required
              />
              {loginError ? <p className="adminError">{loginError}</p> : null}
              <button type="submit" className="submitBtn adminLoginBtn">
                로그인
              </button>
            </form>
          ) : (
            <>
              <div className="adminToolbar">
                <span className="adminCount">
                  총 <strong>{members.length}</strong>명
                </span>
                <button type="button" className="linkBtn adminRefresh" onClick={() => token && fetchMembers(token)}>
                  새로고침
                </button>
              </div>
              {listError ? <p className="adminError">{listError}</p> : null}
              {loading ? <p className="adminLoading">불러오는 중…</p> : null}

              <div className={uiSettings.compactMemberTable ? 'adminTableWrap adminTableWrapCompact' : 'adminTableWrap'}>
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>아이디</th>
                      <th>이름</th>
                      <th>연락처</th>
                      <th>생년월일</th>
                      <th>성별</th>
                      <th>키</th>
                      <th>몸무게</th>
                      <th>직업</th>
                      <th>지역</th>
                      <th>MBTI</th>
                      <th>흡연</th>
                      <th>음주</th>
                      <th>가입일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="adminEmpty">
                          등록된 회원이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr
                          key={m.id}
                          className="adminTableClickRow"
                          tabIndex={0}
                          role="link"
                          aria-label={`${m.name} 회원 상세 보기`}
                          onClick={() => navigate(`/admin/members/${m.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigate(`/admin/members/${m.id}`)
                            }
                          }}
                        >
                          <td>{m.id}</td>
                          <td>{m.userId}</td>
                          <td>{m.name}</td>
                          <td>{m.phone}</td>
                          <td>{m.birth}</td>
                          <td>{m.gender === 'male' ? '남' : m.gender === 'female' ? '여' : m.gender}</td>
                          <td>{m.height}</td>
                          <td>{m.weight}</td>
                          <td>{m.job}</td>
                          <td>
                            {m.region1}/{m.region2}
                          </td>
                          <td>{m.mbti || '—'}</td>
                          <td>{m.smoke === 'yes' ? '흡연' : '비흡연'}</td>
                          <td>{m.drink === 'yes' ? '음주' : '비음주'}</td>
                          <td className="adminCellNowrap">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="adminBack">
            <Link to="/">← 메인으로</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
