import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminListBack } from '../components/AdminListBack'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

export function AdminNoticeCreate() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [published, setPublished] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    const t = token
    if (!t) return
    const nextTitle = title.trim()
    const nextBody = body.trim()
    if (!nextTitle) {
      setError('제목을 입력해 주세요.')
      return
    }
    if (!nextBody) {
      setError('내용을 입력해 주세요.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const r = await apiFetch('/api/admin/notices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: nextTitle, body: nextBody, pinned, published }),
      })
      const j = await readJsonResponse<{ error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '등록하지 못했습니다.')
      window.alert('저장되었습니다.')
      navigate('/admin/notices', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 760 }}>
          <div className="adminDetailHead">
            <AdminListBack to="/admin/notices" label="공지 목록" />
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">공지 등록</h1>
              <p className="adminHint muted">메인 사이트 공지사항 페이지에 노출될 글을 등록합니다.</p>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <form className="adminSettingsCard card" onSubmit={(ev) => void onAdd(ev)}>
              <label className="adminLabel" htmlFor="notice-title">
                제목
              </label>
              <input
                id="notice-title"
                className="adminPwInput"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="공지 제목"
                required
              />

              <label className="adminLabel" htmlFor="notice-body">
                내용
              </label>
              <textarea
                id="notice-body"
                className="adminDetailTextarea"
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={50000}
                placeholder="공지 내용을 입력하세요."
                required
              />

              <label className="adminSettingsRow">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.currentTarget.checked)} />
                <span>상단 고정 공지</span>
              </label>
              <label className="adminSettingsRow">
                <input type="checkbox" checked={published} onChange={(e) => setPublished(e.currentTarget.checked)} />
                <span>즉시 공개</span>
              </label>

              {error ? <p className="adminError">{error}</p> : null}
              <button type="submit" className="submitBtn adminLoginBtn" disabled={saving}>
                {saving ? '저장 중…' : '등록'}
              </button>
            </form>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <Link to="/admin/notices">공지사항</Link>
            {' > '}
            <span>공지 등록</span>
          </p>
        </div>
      </main>
    </div>
  )
}

