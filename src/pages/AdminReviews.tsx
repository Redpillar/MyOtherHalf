import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminPager } from '../components/AdminPager'
import { usePagination } from '../components/AdminPagination'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import type { AdminReviewSummary } from '../review/reviewTypes'
import './admin.scss'

function reviewPhotoUrl(id: number, token: string): string {
  return `/api/admin/reviews/${encodeURIComponent(String(id))}/photo?token=${encodeURIComponent(token)}`
}

export function AdminReviews() {
  const token = useAdminToken()
  const [rows, setRows] = useState<AdminReviewSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const load = useCallback(async () => {
    const t = token
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/admin/reviews', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ reviews?: AdminReviewSummary[]; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setRows([])
        return
      }
      if (!r.ok) throw new Error(j.error || '목록을 불러오지 못했습니다.')
      setRows(Array.isArray(j.reviews) ? j.reviews : [])
      setPage(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const pager = usePagination(rows, page, pageSize)

  const onDelete = async (id: number) => {
    const t = token
    if (!t) return
    if (!window.confirm('이 커플 후기를 삭제할까요?')) return
    setError(null)
    try {
      const r = await apiFetch(`/api/admin/reviews/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '삭제하지 못했습니다.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
    }
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
          <div className="adminHead">
            <h1 className="adminTitle">커플 후기</h1>
            <p className="adminHint muted">후기 목록을 확인하고, 수정/삭제할 수 있습니다.</p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <>
              <div className="adminToolbar">
                <span className="adminCount">
                  총 <strong>{rows.length}</strong>건
                </span>
                <Link
                  to="/admin/reviews/new"
                  className="btnGhost"
                  style={{ textDecoration: 'none', fontWeight: 900, padding: '8px 14px', borderRadius: 10 }}
                >
                  + 후기 등록
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
                      <th>ID</th>
                      <th>이미지</th>
                      <th>제목</th>
                      <th>공개</th>
                      <th>고정</th>
                      <th>등록일</th>
                      <th aria-label="수정" />
                      <th aria-label="삭제" />
                    </tr>
                  </thead>
                  <tbody>
                    {pager.total === 0 && !loading ? (
                      <tr>
                        <td colSpan={8} className="adminEmpty">
                          등록된 커플 후기가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      pager.pageItems.map((row) => (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>
                            {row.hasPhoto ? (
                              <img className="adminManagerThumb" src={reviewPhotoUrl(row.id, token)} alt="" />
                            ) : (
                              <span className="adminManagerThumbPlaceholder">없음</span>
                            )}
                          </td>
                          <td style={{ maxWidth: 420 }}>
                            <div style={{ fontWeight: 800, color: 'rgba(15,23,42,0.88)' }}>{row.title}</div>
                            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                              {row.summary}
                            </div>
                          </td>
                          <td>{row.published ? '공개' : '비공개'}</td>
                          <td>{row.pinned ? '고정' : '-'}</td>
                          <td className="adminCellNowrap">{new Date(row.createdAt).toLocaleString('ko-KR')}</td>
                          <td>
                            <Link to={`/admin/reviews/${row.id}`} className="linkBtn">
                              수정
                            </Link>
                          </td>
                          <td>
                            <button type="button" className="linkBtn" onClick={() => void onDelete(row.id)}>
                              삭제
                            </button>
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
            <span>커플 후기</span>
          </p>
        </div>
      </main>
    </div>
  )
}
