import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminMember } from '../admin/memberTypes'
import { clearAdminToken, setAdminToken, useAdminToken } from '../admin/adminSession'
import { useAdminUiSettings } from '../admin/adminUiSettings'
import { AdminPager } from '../components/AdminPager'
import { usePagination } from '../components/AdminPagination'
import { SiteHeader } from '../components/SiteHeader'
import { findSidoName, findSigunguName } from '../data/koreaRegions'
import { formatMemberDateTime } from '../admin/memberFormat'
import { adminConsultationStatusLabel } from '../consult/consultTypes'
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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
      setPage(1)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'API 서버 연결을 확인하세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) void fetchMembers(token)
  }, [token, fetchMembers])

  const pager = usePagination(members, page, pageSize)

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
          <div className="adminHead">
            <h1 className="adminTitle">회원 목록</h1>
            <p className="adminHint muted">가입된 회원을 확인하고, 행을 클릭해 상세 정보로 이동할 수 있습니다.</p>
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
                      <th>상담 상태</th>
                      <th>MBTI</th>
                      <th>흡연</th>
                      <th>음주</th>
                      <th>가입일시</th>
                      <th>최근 로그인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pager.total === 0 ? (
                      <tr>
                        <td colSpan={16} className="adminEmpty">
                          등록된 회원이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      pager.pageItems.map((m) => (
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
                            {findSidoName(m.region1)} · {findSigunguName(m.region1, m.region2)}
                          </td>
                          <td className="adminCellNowrap">{adminConsultationStatusLabel(m.consultationStatus)}</td>
                          <td>{m.mbti || '—'}</td>
                          <td>{m.smoke === 'yes' ? '흡연' : '비흡연'}</td>
                          <td>{m.drink === 'yes' ? '음주' : '비음주'}</td>
                          <td className="adminCellNowrap">{formatMemberDateTime(m.createdAt)}</td>
                          <td className="adminCellNowrap">{formatMemberDateTime(m.lastLoginAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && pager.total > 0 ? (
                <AdminPager
                  page={pager.page}
                  pageSize={pager.pageSize}
                  total={pager.total}
                  totalPages={pager.totalPages}
                  from={pager.from}
                  to={pager.to}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => {
                    setPageSize(n)
                    setPage(1)
                  }}
                />
              ) : null}
            </>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <span>회원 목록</span>
          </p>
        </div>
      </main>
    </div>
  )
}
