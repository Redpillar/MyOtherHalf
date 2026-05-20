import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

function statusBadgeClass(s: string) {
  return s === 'closed' ? 'inquiryStatusBadge inquiryStatusBadge--closed' : 'inquiryStatusBadge'
}

export function InquiryList() {
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

  const leadText =
    member && profile?.userId?.trim()
      ? '로그인한 아이디로 접수한 문의만 표시됩니다. 제목을 눌러 상세와 답변을 확인하세요.'
      : '접수된 문의 목록입니다. 제목을 눌러 상세와 답변을 확인하세요.'

  return (
    <div className="inquiryPage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="inquiryHero">
          <div className="container inquiryHeroInner">
            <h1 className="inquiryHeroTitle">1:1 문의</h1>
            <p className="inquiryHeroLead">{leadText}</p>
          </div>
        </section>

        <div className="container signupInner inquiryListWrap">
          <div className="inquiryListHead">
            <span className="inquiryListCount">
              총 <strong>{rows.length}</strong>건
            </span>
            <Link to="/inquiry/new" className="inquiryAskBtn">
              문의하기
            </Link>
          </div>

          {error ? <p className="adminError">{error}</p> : null}
          {loading ? <p className="adminLoading">불러오는 중…</p> : null}

          {!loading && !error ? (
            <div className="inquiryList">
              {rows.length === 0 ? (
                <div className="card inquiryEmpty">
                  등록된 문의가 없습니다. <Link to="/inquiry/new">문의하기</Link>
                </div>
              ) : (
                rows.map((r) => (
                  <Link key={r.id} to={`/inquiry/${r.id}`} className="card inquiryCard">
                    <div className="inquiryCardMeta">
                      <span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
                      <span className={r.hasReply ? 'inquiryReplyBadge' : 'inquiryReplyBadge inquiryReplyBadge--pending'}>
                        {r.hasReply ? '답변 등록됨' : '답변 대기'}
                      </span>
                      <span>문의 #{r.id}</span>
                      <span>{new Date(r.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                    <h2 className="inquiryCardTitle">{r.title}</h2>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
