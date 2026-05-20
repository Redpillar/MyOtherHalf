import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminListBack } from '../components/AdminListBack'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import type { AdminReview } from '../review/reviewTypes'
import './admin.scss'

function reviewPhotoUrl(id: number, token: string): string {
  return `/api/admin/reviews/${encodeURIComponent(String(id))}/photo?token=${encodeURIComponent(token)}`
}

export function AdminReviewDetail() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAdminToken()
  const id = idParam && /^\d+$/.test(idParam) ? idParam : ''

  const [row, setRow] = useState<AdminReview | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [published, setPublished] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [photoBust, setPhotoBust] = useState(0)

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
      const r = await apiFetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ review?: AdminReview; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setLoadError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setRow(null)
        return
      }
      if (r.status === 404) {
        setLoadError(j.error || '커플 후기를 찾을 수 없습니다.')
        setRow(null)
        return
      }
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      if (!j.review) throw new Error('데이터가 없습니다.')
      setRow(j.review)
      setTitle(j.review.title)
      setSubtitle(j.review.subtitle)
      setSummary(j.review.summary)
      setBody(j.review.body)
      setHasPhoto(j.review.hasPhoto)
      setFile(null)
      setPinned(j.review.pinned)
      setPublished(j.review.published)
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
      const fd = new FormData()
      fd.set('title', title.trim())
      fd.set('subtitle', subtitle.trim())
      fd.set('summary', summary.trim())
      fd.set('body', body.trim())
      fd.set('pinned', String(pinned))
      fd.set('published', String(published))
      if (file) fd.set('photo', file)
      const r = await apiFetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const j = await readJsonResponse<{ review?: AdminReview; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setSaveError('세션이 만료되었습니다.')
        return
      }
      if (!r.ok) {
        setSaveError(j.error || `저장 실패 (${r.status})`)
        return
      }
      if (j.review) {
        setRow(j.review)
        setTitle(j.review.title)
        setSubtitle(j.review.subtitle)
        setSummary(j.review.summary)
        setBody(j.review.body)
        setHasPhoto(j.review.hasPhoto)
        setFile(null)
        setPinned(j.review.pinned)
        setPublished(j.review.published)
        setPhotoBust((x) => x + 1)
        window.alert('수정 되었습니다.')
        navigate('/admin/reviews', { replace: true })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류')
    } finally {
      setSaving(false)
    }
  }

  const photoSrc = id && hasPhoto && token ? `${reviewPhotoUrl(Number(id), token)}&v=${photoBust}` : ''

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 760 }}>
          <div className="adminDetailHead">
            <AdminListBack to="/admin/reviews" label="후기 목록" />
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">커플 후기 상세 #{id || '—'}</h1>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : loading ? (
            <p className="adminLoading">불러오는 중…</p>
          ) : loadError || !row ? (
            <p className="adminError">{loadError || '커플 후기를 찾을 수 없습니다.'}</p>
          ) : (
            <>
              <div className="adminSettingsCard card" style={{ marginBottom: 16 }}>
                <h2 className="adminSettingsSectionTitle">후기 정보</h2>
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
                {hasPhoto ? (
                  <div className="adminReviewImagePreviewWrap">
                    <img key={photoSrc} className="adminReviewImagePreview" src={photoSrc} alt="현재 후기 이미지" />
                  </div>
                ) : (
                  <p className="adminHint muted" style={{ margin: 0 }}>
                    아직 등록된 상단 이미지가 없습니다.
                  </p>
                )}
              </div>

              <form className="adminSettingsCard card" onSubmit={(ev) => void onSave(ev)}>
                <h2 className="adminSettingsSectionTitle">후기 수정</h2>
                <label className="adminLabel" htmlFor="review-edit-title">
                  제목
                </label>
                <input
                  id="review-edit-title"
                  className="adminPwInput"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />

                <label className="adminLabel" htmlFor="review-edit-subtitle">
                  부제목
                </label>
                <input
                  id="review-edit-subtitle"
                  className="adminPwInput"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  maxLength={200}
                />

                <label className="adminLabel" htmlFor="review-edit-summary">
                  요약
                </label>
                <textarea
                  id="review-edit-summary"
                  className="adminDetailTextarea"
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  maxLength={500}
                />

                <label className="adminLabel" htmlFor="review-edit-body">
                  본문
                </label>
                <textarea
                  id="review-edit-body"
                  className="adminDetailTextarea"
                  rows={14}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={50000}
                />

                <label className="adminLabel" htmlFor="review-edit-photo">
                  상단 이미지 바꾸기
                </label>
                <input
                  id="review-edit-photo"
                  type="file"
                  accept="image/*"
                  className="adminPwInput"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="adminHint muted" style={{ marginTop: -8 }}>
                  새 이미지를 선택하면 카드 위 카톡 캡처 영역이 이 이미지로 교체됩니다.
                </p>

                <label className="adminSettingsRow">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.currentTarget.checked)} />
                  <span>추천 후기 상단 고정</span>
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
            <Link to="/admin/reviews">커플 후기</Link>
            {' > '}
            <span>후기 상세</span>
          </p>
        </div>
      </main>
    </div>
  )
}
