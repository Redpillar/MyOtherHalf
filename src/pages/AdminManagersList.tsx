import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminManagerRow } from '../admin/managerTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

function managerPhotoUrl(id: number): string {
  return `/api/managers/${encodeURIComponent(String(id))}/photo`
}

export function AdminManagersList() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const [managers, setManagers] = useState<AdminManagerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const t = token
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/admin/managers', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ managers?: AdminManagerRow[]; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setManagers([])
        return
      }
      if (!r.ok) throw new Error(j.error || '목록을 불러오지 못했습니다.')
      setManagers(Array.isArray(j.managers) ? j.managers : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setManagers([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">매니저 목록</h1>
            <p className="adminHint muted">행을 눌러 정보를 수정할 수 있습니다.</p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <>
              <div className="adminToolbar">
                <span className="adminCount">
                  총 <strong>{managers.length}</strong>명
                </span>
                <Link to="/admin/managers/register" className="btnGhost" style={{ textDecoration: 'none', fontWeight: 800 }}>
                  매니저 등록
                </Link>
                <button type="button" className="linkBtn adminRefresh" onClick={() => void load()}>
                  새로고침
                </button>
              </div>
              {error ? <p className="adminError">{error}</p> : null}
              {loading ? <p className="adminLoading">불러오는 중…</p> : null}

              <div className="adminTableWrap">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th aria-label="사진" />
                      <th>ID</th>
                      <th>이름</th>
                      <th>별점</th>
                      <th>성사</th>
                      <th>후기</th>
                      <th>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="adminEmpty">
                          등록된 매니저가 없습니다.{' '}
                          <Link to="/admin/managers/register">매니저 등록</Link>
                        </td>
                      </tr>
                    ) : (
                      managers.map((m) => (
                        <tr
                          key={m.id}
                          className="adminTableClickRow"
                          tabIndex={0}
                          role="link"
                          aria-label={`${m.name} 매니저 수정`}
                          onClick={() => navigate(`/admin/managers/${m.id}/edit`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigate(`/admin/managers/${m.id}/edit`)
                            }
                          }}
                        >
                          <td className="adminManagerThumbCell">
                            {m.hasPhoto ? (
                              <img
                                className="adminManagerThumb"
                                src={managerPhotoUrl(m.id)}
                                alt=""
                                width={40}
                                height={40}
                              />
                            ) : (
                              <span className="adminManagerThumbPlaceholder" aria-hidden>
                                —
                              </span>
                            )}
                          </td>
                          <td>{m.id}</td>
                          <td>{m.name}</td>
                          <td>{m.ratingStars}</td>
                          <td>{m.successCount}</td>
                          <td>{m.reviewCount}</td>
                          <td className="adminCellNowrap">
                            {m.createdAt ? new Date(m.createdAt).toLocaleString('ko-KR') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="adminBack">
            <Link to="/admin">← 회원 목록</Link>
            {' · '}
            <Link to="/">메인</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
