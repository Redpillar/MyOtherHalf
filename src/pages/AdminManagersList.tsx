import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AdminManagerRow } from '../admin/managerTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminPager } from '../components/AdminPager'
import { usePagination } from '../components/AdminPagination'
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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
      setPage(1)
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

  const pager = usePagination(managers, page, pageSize)

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
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
                      <th>한 줄 소개</th>
                      <th>성사</th>
                      <th>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pager.total === 0 ? (
                      <tr>
                        <td colSpan={6} className="adminEmpty">
                          등록된 매니저가 없습니다.{' '}
                          <Link to="/admin/managers/register">매니저 등록</Link>
                        </td>
                      </tr>
                    ) : (
                      pager.pageItems.map((m) => (
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
                          <td style={{ maxWidth: 280 }}>
                            <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                              {m.intro || '—'}
                            </div>
                          </td>
                          <td>{m.successCount}</td>
                          <td className="adminCellNowrap">
                            {m.createdAt ? new Date(m.createdAt).toLocaleString('ko-KR') : '—'}
                          </td>
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
            <span>매니저 목록</span>
          </p>
        </div>
      </main>
    </div>
  )
}
