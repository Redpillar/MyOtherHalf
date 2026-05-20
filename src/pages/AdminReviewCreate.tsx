import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminListBack } from '../components/AdminListBack'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

export function AdminReviewCreate() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pinned, setPinned] = useState(false)
  const [published, setPublished] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const t = token
    if (!t) return
    const nextTitle = title.trim()
    const nextSummary = summary.trim()
    const nextBody = body.trim()

    if (!nextTitle) return setError('제목을 입력해 주세요.')
    if (!nextSummary) return setError('요약을 입력해 주세요.')
    if (!nextBody) return setError('본문을 입력해 주세요.')
    if (!file) return setError('상단 이미지를 선택해 주세요.')

    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('title', nextTitle)
      fd.set('subtitle', subtitle.trim())
      fd.set('summary', nextSummary)
      fd.set('body', nextBody)
      fd.set('pinned', String(pinned))
      fd.set('published', String(published))
      fd.set('photo', file)

      const r = await apiFetch('/api/admin/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const j = await readJsonResponse<{ error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '등록하지 못했습니다.')
      window.alert('저장되었습니다.')
      navigate('/admin/reviews', { replace: true })
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
            <AdminListBack to="/admin/reviews" label="후기 목록" />
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">후기 등록</h1>
              <p className="adminHint muted">공개 후기 페이지에 노출할 커플 후기를 등록합니다.</p>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <form className="adminSettingsCard card" onSubmit={(ev) => void onAdd(ev)}>
              <label className="adminLabel" htmlFor="review-title">
                제목
              </label>
              <input
                id="review-title"
                className="adminPwInput"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="후기 제목"
                required
              />

              <label className="adminLabel" htmlFor="review-subtitle">
                부제목
              </label>
              <input
                id="review-subtitle"
                className="adminPwInput"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={200}
                placeholder="카드 하단에 보여줄 한 줄 설명"
              />

              <label className="adminLabel" htmlFor="review-summary">
                요약
              </label>
              <textarea
                id="review-summary"
                className="adminDetailTextarea"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={500}
                placeholder="목록 카드와 상세 상단에 보여줄 요약"
                required
              />

              <label className="adminLabel" htmlFor="review-body">
                본문
              </label>
              <textarea
                id="review-body"
                className="adminDetailTextarea"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={50000}
                placeholder="후기 전문을 입력하세요."
                required
              />

              <label className="adminLabel" htmlFor="review-photo">
                상단 이미지
              </label>
              <input
                id="review-photo"
                type="file"
                accept="image/*"
                className="adminPwInput"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="adminHint muted">카톡 캡처 이미지처럼 카드 상단에 직접 노출될 이미지를 선택해 주세요.</p>

              <label className="adminSettingsRow">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.currentTarget.checked)} />
                <span>추천 후기 상단 고정</span>
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
            <Link to="/admin/reviews">커플 후기</Link>
            {' > '}
            <span>후기 등록</span>
          </p>
        </div>
      </main>
    </div>
  )
}

