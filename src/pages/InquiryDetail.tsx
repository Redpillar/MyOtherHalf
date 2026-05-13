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
    <div className="loginPage inquiryDetailPage">
      <SiteHeader />

      <main className="signupMain">
        <div className="container signupInner" style={{ maxWidth: 720 }}>
          <p style={{ margin: '0 0 12px', fontSize: 14 }}>
            <Link to="/inquiry" className="navLink" style={{ fontWeight: 800 }}>
              ← 문의 목록
            </Link>
          </p>

          {loading ? <p className="adminLoading">불러오는 중…</p> : null}
          {error ? <p className="adminError">{error}</p> : null}

          {!loading && !error && row ? (
            <>
              <h1 className="signupTitle" style={{ fontSize: 22, marginBottom: 8 }}>
                {row.title}
              </h1>
              <p className="inquiryDetailMeta">
                문의 #{row.id} · {statusLabel(row.status)} · 접수{' '}
                {new Date(row.createdAt).toLocaleString('ko-KR')}
              </p>

              <div className="adminSettingsCard card inquiryDetailBlock">
                <h2 className="adminSettingsSectionTitle">문의 내용</h2>
                <pre className="adminInquiryBody">{row.body}</pre>
              </div>

              <div className="adminSettingsCard card inquiryDetailBlock">
                <h2 className="adminSettingsSectionTitle">답변</h2>
                {hasReply ? (
                  <>
                    {row.replyAt ? (
                      <p className="inquiryDetailMeta" style={{ marginTop: 0 }}>
                        답변 등록: {new Date(row.replyAt).toLocaleString('ko-KR')}
                      </p>
                    ) : null}
                    <pre className="adminInquiryBody inquiryReplyBody">{row.reply}</pre>
                  </>
                ) : (
                  <p className="inquiryDetailPending">아직 등록된 답변이 없습니다. 순차적으로 안내드리겠습니다.</p>
                )}
              </div>

              <p style={{ marginTop: 20, fontSize: 14 }}>
                <Link to="/inquiry/new" className="navLink" style={{ fontWeight: 800 }}>
                  추가 문의하기
                </Link>
                {' · '}
                <Link to="/" className="navLink" style={{ fontWeight: 800 }}>
                  메인
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
