import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { PublicInquiryDetail } from '../inquiry/inquiryTypes'
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

export function InquiryDetail() {
  const { id } = useParams<{ id: string }>()
  const member = useMemberSession()
  const profile = useMemberProfile()
  const [row, setRow] = useState<PublicInquiryDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) {
      setLoading(false)
      setError('잘못된 문의 번호입니다.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (member && !String(profile?.userId || '').trim()) {
        setError('회원 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
        setRow(null)
        return
      }
      const q = inquiryMemberQuery(member, profile?.userId)
      const r = await apiFetch(`/api/inquiries/${encodeURIComponent(id)}${q}`)
      const j = (await r.json()) as { inquiry?: PublicInquiryDetail; error?: string }
      if (r.status === 404) {
        setError(j.error || '문의를 찾을 수 없습니다.')
        setRow(null)
        return
      }
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      if (!j.inquiry) throw new Error('데이터가 없습니다.')
      setRow(j.inquiry)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [id, member, profile?.userId])

  useEffect(() => {
    void load()
  }, [load])

  const hasReply = Boolean(row?.reply?.trim())

  return (
    <div className="inquiryPage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="inquiryHero">
          <div className="container inquiryHeroInner">
            <h1 className="inquiryHeroTitle">1:1 문의</h1>
            <p className="inquiryHeroLead">문의 내용과 답변을 확인하세요.</p>
          </div>
        </section>

        <div className="container signupInner inquiryDetailWrap">
          <p className="inquiryBackRow">
            <Link to="/inquiry" className="navLink" style={{ fontWeight: 800 }}>
              ← 문의 목록
            </Link>
          </p>

          {loading ? <p className="adminLoading">불러오는 중…</p> : null}
          {error ? <p className="adminError">{error}</p> : null}

          {!loading && !error && row ? (
            <>
              <h2 className="inquiryDetailTitle">{row.title}</h2>
              <p className="inquiryDetailMeta">
                문의 #{row.id} · {statusLabel(row.status)} · 접수 {new Date(row.createdAt).toLocaleString('ko-KR')}
              </p>

              <article className="card inquiryDetailCard">
                <h3 className="inquirySectionTitle">문의 내용</h3>
                <pre className="inquiryBody">{row.body}</pre>
              </article>

              <article className="card inquiryDetailCard">
                <h3 className="inquirySectionTitle">답변</h3>
                {hasReply ? (
                  <>
                    {row.replyAt ? (
                      <p className="inquiryDetailMeta" style={{ marginTop: 0 }}>
                        답변 등록: {new Date(row.replyAt).toLocaleString('ko-KR')}
                      </p>
                    ) : null}
                    <pre className="inquiryBody">{row.reply}</pre>
                  </>
                ) : (
                  <p className="inquiryDetailPending">아직 등록된 답변이 없습니다. 순차적으로 안내드리겠습니다.</p>
                )}
              </article>

              <div className="inquiryDetailActions">
                <Link to="/inquiry/new" className="navLink">
                  추가 문의하기
                </Link>
                <Link to="/" className="navLink">
                  메인으로
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
