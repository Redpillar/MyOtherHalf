import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminInquiry, InquiryStatus } from '../inquiry/inquiryTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

export function AdminInquiryDetail() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAdminToken()
  const id = idParam && /^\d+$/.test(idParam) ? idParam : ''

  const [row, setRow] = useState<AdminInquiry | null>(null)
  const [status, setStatus] = useState<InquiryStatus>('new')
  const [adminMemo, setAdminMemo] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const t = token
    if (!t || !id) {
      setLoading(false)
      if (!id) setLoadError('잘못된 경로입니다.')
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const r = await apiFetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ inquiry?: AdminInquiry; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setLoadError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setRow(null)
        return
      }
      if (r.status === 404) {
        setLoadError(j.error || '문의를 찾을 수 없습니다.')
        setRow(null)
        return
      }
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      const inv = j.inquiry
      if (!inv) throw new Error('데이터가 없습니다.')
      setRow(inv)
      setStatus(inv.status)
      setAdminMemo(inv.adminMemo || '')
      setReply(inv.reply || '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '오류')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    void load()
  }, [load])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    const t = token
    if (!t || !id || !row) return
    setSaveError(null)
    setSaving(true)
    try {
      const r = await apiFetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminMemo, reply }),
      })
      const j = await readJsonResponse<{ inquiry?: AdminInquiry; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setSaveError('세션이 만료되었습니다.')
        return
      }
      if (!r.ok) {
        setSaveError(j.error || `저장 실패 (${r.status})`)
        return
      }
      if (j.inquiry) {
        setRow(j.inquiry)
        setStatus(j.inquiry.status)
        setAdminMemo(j.inquiry.adminMemo || '')
        setReply(j.inquiry.reply || '')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 720 }}>
          <AdminMenu />

          <div className="adminDetailHead">
            <button type="button" className="adminDetailBackBtn" onClick={() => navigate('/admin/inquiries')}>
              ← 문의 목록
            </button>
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">문의 상세 #{id || '—'}</h1>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : loading ? (
            <p className="adminLoading">불러오는 중…</p>
          ) : loadError || !row ? (
            <p className="adminError">{loadError || '문의를 찾을 수 없습니다.'}</p>
          ) : (
            <>
              <div className="adminSettingsCard card" style={{ marginBottom: 16 }}>
                <h2 className="adminSettingsSectionTitle">접수 내용</h2>
                <div className="adminDetailDl" role="list">
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">회원 ID</div>
                    <div className="adminDetailDd">{row.memberUserId?.trim() || '—'}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">이름</div>
                    <div className="adminDetailDd">{row.name?.trim() || '—'}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">이메일</div>
                    <div className="adminDetailDd">{row.email}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">연락처</div>
                    <div className="adminDetailDd">{row.phone || '—'}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">제목</div>
                    <div className="adminDetailDd">{row.title}</div>
                  </div>
                  <div className="adminDetailRow adminDetailRowBlock">
                    <div className="adminDetailDt">내용</div>
                    <div className="adminDetailDd">
                      <pre className="adminInquiryBody">{row.body}</pre>
                    </div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">접수일시</div>
                    <div className="adminDetailDd">{new Date(row.createdAt).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              </div>

              <form className="adminSettingsCard card" onSubmit={(ev) => void onSave(ev)}>
                <h2 className="adminSettingsSectionTitle">관리 · 답변</h2>
                <p className="adminMenuSettingsHint muted" style={{ marginTop: 0 }}>
                  아래 답변은 <strong>고객용 문의 상세</strong> 페이지에 그대로 노출됩니다.
                </p>

                <label className="adminLabel" htmlFor="inq-reply">
                  고객 답변
                </label>
                <textarea
                  id="inq-reply"
                  className="adminDetailTextarea"
                  rows={8}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={20000}
                  placeholder="고객에게 보여 줄 답변을 입력하세요."
                />

                <label className="adminLabel" htmlFor="inq-status" style={{ marginTop: 16 }}>
                  상태
                </label>
                <select
                  id="inq-status"
                  className="adminPwInput"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InquiryStatus)}
                >
                  <option value="new">신규</option>
                  <option value="in_progress">처리중</option>
                  <option value="closed">종료</option>
                </select>

                <label className="adminLabel" htmlFor="inq-memo" style={{ marginTop: 12 }}>
                  관리자 메모 (내부)
                </label>
                <textarea
                  id="inq-memo"
                  className="adminDetailTextarea"
                  rows={5}
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  maxLength={10000}
                  placeholder="상담 메모, 답변 요약 등"
                />

                {saveError ? <p className="adminError">{saveError}</p> : null}
                <button type="submit" className="submitBtn adminLoginBtn" disabled={saving}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </form>
            </>
          )}

          <p className="adminBack">
            <Link to="/">메인</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
