import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminNotice } from '../notice/noticeTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

export function AdminNoticeDetail() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAdminToken()
  const id = idParam && /^\d+$/.test(idParam) ? idParam : ''

  const [row, setRow] = useState<AdminNotice | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [published, setPublished] = useState(true)
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
      const r = await apiFetch(`/api/admin/notices/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ notice?: AdminNotice; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setLoadError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setRow(null)
        return
      }
      if (r.status === 404) {
        setLoadError(j.error || '공지사항을 찾을 수 없습니다.')
        setRow(null)
        return
      }
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      if (!j.notice) throw new Error('데이터가 없습니다.')
      setRow(j.notice)
      setTitle(j.notice.title)
      setBody(j.notice.body)
      setPinned(j.notice.pinned)
      setPublished(j.notice.published)
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
      const r = await apiFetch(`/api/admin/notices/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          pinned,
          published,
        }),
      })
      const j = await readJsonResponse<{ notice?: AdminNotice; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setSaveError('세션이 만료되었습니다.')
        return
      }
      if (!r.ok) {
        setSaveError(j.error || `저장 실패 (${r.status})`)
        return
      }
      if (j.notice) {
        setRow(j.notice)
        setTitle(j.notice.title)
        setBody(j.notice.body)
        setPinned(j.notice.pinned)
        setPublished(j.notice.published)
        window.alert('저장되었습니다.')
        navigate('/admin/notices', { replace: true })
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
        <div className="container adminInner" style={{ maxWidth: 760 }}>
          <AdminMenu />

          <div className="adminDetailHead">
            <button type="button" className="adminDetailBackBtn" onClick={() => navigate('/admin/notices')}>
              ← 공지 목록
            </button>
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">공지 상세 #{id || '—'}</h1>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : loading ? (
            <p className="adminLoading">불러오는 중…</p>
          ) : loadError || !row ? (
            <p className="adminError">{loadError || '공지사항을 찾을 수 없습니다.'}</p>
          ) : (
            <>
              <div className="adminSettingsCard card" style={{ marginBottom: 16 }}>
                <h2 className="adminSettingsSectionTitle">공지 정보</h2>
                <div className="adminDetailDl" role="list">
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">등록일</div>
                    <div className="adminDetailDd">{new Date(row.createdAt).toLocaleString('ko-KR')}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">수정일</div>
                    <div className="adminDetailDd">{new Date(row.updatedAt).toLocaleString('ko-KR')}</div>
                  </div>
                  <div className="adminDetailRow">
                    <div className="adminDetailDt">현재 상태</div>
                    <div className="adminDetailDd">{row.published ? '공개' : '비공개'}</div>
                  </div>
                </div>
              </div>

              <form className="adminSettingsCard card" onSubmit={(ev) => void onSave(ev)}>
                <h2 className="adminSettingsSectionTitle">공지 수정</h2>
                <label className="adminLabel" htmlFor="notice-edit-title">
                  제목
                </label>
                <input
                  id="notice-edit-title"
                  className="adminPwInput"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />

                <label className="adminLabel" htmlFor="notice-edit-body">
                  내용
                </label>
                <textarea
                  id="notice-edit-body"
                  className="adminDetailTextarea"
                  rows={14}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={50000}
                />

                <label className="adminSettingsRow">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.currentTarget.checked)} />
                  <span>상단 고정 공지</span>
                </label>
                <label className="adminSettingsRow">
                  <input type="checkbox" checked={published} onChange={(e) => setPublished(e.currentTarget.checked)} />
                  <span>공개 상태</span>
                </label>

                {saveError ? <p className="adminError">{saveError}</p> : null}
                <button type="submit" className="submitBtn adminLoginBtn" disabled={saving}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </form>
            </>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <Link to="/admin/notices">공지사항</Link>
            {' > '}
            <span>공지 상세</span>
          </p>
        </div>
      </main>
    </div>
  )
}
