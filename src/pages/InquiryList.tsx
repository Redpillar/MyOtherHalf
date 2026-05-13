import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PublicInquirySummary } from '../inquiry/inquiryTypes'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch } from '../lib/apiFetch'
import { inquiryMemberQuery } from '../lib/inquiryMemberQuery'
import { useMemberProfile, useMemberSession } from '../lib/memberSession'
import './signup.scss'
import './admin.scss'
import './inquiry.scss'

function statusLabel(s: string) {
  if (s === 'new') return '접수'
  if (s === 'in_progress') return '처리중'
  if (s === 'closed') return '종료'
  return s
}

export function InquiryList() {
  const navigate = useNavigate()
  const member = useMemberSession()
  const profile = useMemberProfile()
  const [rows, setRows] = useState<PublicInquirySummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (member && !String(profile?.userId || '').trim()) {
        setRows([])
        return
      }
      const q = inquiryMemberQuery(member, profile?.userId)
      const r = await apiFetch(`/api/inquiries${q}`)
      const j = (await r.json()) as { inquiries?: PublicInquirySummary[]; error?: string }
      if (!r.ok) throw new Error(j.error || '목록을 불러오지 못했습니다.')
      setRows(Array.isArray(j.inquiries) ? j.inquiries : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [member, profile?.userId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="loginPage inquiryListPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner inquiryListInner">
          <div className="inquiryListHead">
            <div>
              <h1 className="signupTitle inquiryListTitle">1:1 문의</h1>
              <p className="inquiryListSub">
                {member && profile?.userId?.trim()
                  ? '로그인한 아이디로 접수한 문의만 표시됩니다. 제목을 눌러 상세와 답변을 확인하세요.'
                  : '접수된 문의 목록입니다. 제목을 눌러 상세와 답변을 확인하세요.'}
              </p>
            </div>
            <Link to="/inquiry/new" className="submitBtn inquiryAskBtn">
              문의하기
            </Link>
          </div>

          {error ? <p className="adminError">{error}</p> : null}
          {loading ? <p className="adminLoading">불러오는 중…</p> : null}

          <div className="adminTableWrap inquiryTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>제목</th>
                  <th>상태</th>
                  <th>답변</th>
                  <th>접수일</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="adminEmpty">
                      등록된 문의가 없습니다. <Link to="/inquiry/new">문의하기</Link>
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
                      onClick={() => navigate(`/inquiry/${r.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/inquiry/${r.id}`)
                        }
                      }}
                    >
                      <td>{r.id}</td>
                      <td>{r.title}</td>
                      <td>{statusLabel(r.status)}</td>
                      <td>{r.hasReply ? '등록됨' : '대기'}</td>
                      <td className="adminCellNowrap">{new Date(r.createdAt).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 24, fontSize: 14 }}>
            <Link to="/" className="navLink" style={{ fontWeight: 800 }}>
              ← 메인으로
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
