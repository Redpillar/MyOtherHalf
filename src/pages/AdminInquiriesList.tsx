import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { InquiryListItem } from '../inquiry/inquiryTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

function statusLabel(s: string) {
  if (s === 'new') return '신규'
  if (s === 'in_progress') return '처리중'
  if (s === 'closed') return '종료'
  return s
}

export function AdminInquiriesList() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const [rows, setRows] = useState<InquiryListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const t = token
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/admin/inquiries', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ inquiries?: InquiryListItem[]; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setRows([])
        return
      }
      if (!r.ok) throw new Error(j.error || '목록을 불러오지 못했습니다.')
      setRows(Array.isArray(j.inquiries) ? j.inquiries : [])
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

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">1:1 문의 관리</h1>
            <p className="adminHint muted">접수된 문의를 확인하고 답변·상태·내부 메모를 수정할 수 있습니다.</p>
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
                      <th>번호</th>
                      <th>회원 ID</th>
                      <th>상태</th>
                      <th>제목</th>
                      <th>이름</th>
                      <th>이메일</th>
                      <th>연락처</th>
                      <th>답변</th>
                      <th>접수일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="adminEmpty">
                          접수된 문의가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr
                          key={r.id}
                          className="adminTableClickRow"
                          tabIndex={0}
                          role="link"
                          aria-label={`문의 ${r.id} 상세`}
                          onClick={() => navigate(`/admin/inquiries/${r.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigate(`/admin/inquiries/${r.id}`)
                            }
                          }}
                        >
                          <td>{r.id}</td>
                          <td className="adminCellNowrap">{r.memberUserId || '—'}</td>
                          <td>{statusLabel(r.status)}</td>
                          <td>{r.title}</td>
                          <td>{r.name}</td>
                          <td className="adminCellNowrap">{r.email}</td>
                          <td>{r.phone || '—'}</td>
                          <td>{r.hasReply ? '등록됨' : '대기'}</td>
                          <td className="adminCellNowrap">{new Date(r.createdAt).toLocaleString('ko-KR')}</td>
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
            <Link to="/inquiry">고객 문의 목록</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
