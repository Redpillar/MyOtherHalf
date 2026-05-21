import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AdminManagerRow } from '../admin/managerTypes'
import { formatManagerTagsInput } from '../admin/managerTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminListBack } from '../components/AdminListBack'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'

function managerPhotoUrl(id: number): string {
  return `/api/managers/${encodeURIComponent(String(id))}/photo`
}

export function AdminManagerEdit() {
  const { id: idParam } = useParams<{ id: string }>()
  const token = useAdminToken()
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : NaN

  const [name, setName] = useState('')
  const [intro, setIntro] = useState('')
  const [tags, setTags] = useState('')
  const [consultMethod, setConsultMethod] = useState('')
  const [successCount, setSuccessCount] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [hasPhoto, setHasPhoto] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [photoBust, setPhotoBust] = useState(0)

  const load = useCallback(async () => {
    const t = token
    if (!t || !Number.isFinite(id)) {
      setLoading(false)
      if (!Number.isFinite(id)) setLoadError('잘못된 매니저 ID입니다.')
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const r = await apiFetch(`/api/admin/managers/${encodeURIComponent(String(id))}`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ manager?: AdminManagerRow; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setLoadError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (r.status === 404) {
        setLoadError(j.error || '매니저를 찾을 수 없습니다.')
        return
      }
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      const m = j.manager
      if (!m) throw new Error('데이터가 없습니다.')
      setName(m.name)
      setIntro(m.intro || '')
      setTags(formatManagerTagsInput(m.tags))
      setConsultMethod(m.consultMethod || '')
      setSuccessCount(m.successCount)
      setHasPhoto(m.hasPhoto)
      setFile(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '오류')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    void load()
  }, [load])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const t = token
    if (!t || !Number.isFinite(id)) return
    setSaveError(null)
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('name', name.trim())
      fd.set('intro', intro.trim())
      fd.set('tags', tags.trim())
      fd.set('consultMethod', consultMethod.trim())
      fd.set('successCount', String(Math.max(0, Math.floor(successCount))))
      if (file) fd.set('photo', file)

      const r = await apiFetch(`/api/admin/managers/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const j = await readJsonResponse<{ manager?: AdminManagerRow; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setSaveError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) {
        setSaveError(j.error || `저장하지 못했습니다. (${r.status})`)
        return
      }
      if (j.manager?.hasPhoto) setHasPhoto(true)
      if (j.manager) {
        setTags(formatManagerTagsInput(j.manager.tags))
      }
      setFile(null)
      setPhotoBust((x) => x + 1)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const photoSrc = Number.isFinite(id) && hasPhoto ? `${managerPhotoUrl(id)}?v=${photoBust}` : ''

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 560 }}>
          <div className="adminDetailHead">
            <AdminListBack to="/admin/managers" label="매니저 목록" />
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">매니저 수정</h1>
              {Number.isFinite(id) ? <p className="adminHint muted">매니저 ID · {id}</p> : null}
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : loading ? (
            <p className="adminLoading">불러오는 중…</p>
          ) : loadError ? (
            <p className="adminError">{loadError}</p>
          ) : (
            <form className="adminLoginCard card" style={{ maxWidth: '100%' }} onSubmit={(ev) => void onSubmit(ev)}>
              {hasPhoto && Number.isFinite(id) ? (
                <div className="adminManagerEditPreview">
                  <img key={photoSrc} className="adminManagerEditPreviewImg" src={photoSrc} alt="현재 프로필" />
                </div>
              ) : (
                <p className="adminHint muted" style={{ margin: 0 }}>
                  등록된 프로필 사진이 없습니다. 아래에서 이미지를 선택하면 추가됩니다.
                </p>
              )}

              <label className="adminLabel" htmlFor="edit-mgr-name">
                매니저 이름 <span className="req">*</span>
              </label>
              <input
                id="edit-mgr-name"
                className="adminPwInput"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label className="adminLabel" htmlFor="edit-mgr-intro">
                한 줄 소개
              </label>
              <textarea
                id="edit-mgr-intro"
                className="adminPwInput"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="예: 20대·30대 직장인 맞춤 매칭 전문"
                rows={3}
                maxLength={200}
              />

              <label className="adminLabel" htmlFor="edit-mgr-tags">
                키워드 태그
              </label>
              <input
                id="edit-mgr-tags"
                className="adminPwInput"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="예: 카카오톡 상담, 프로필 코칭, 첫 만남 케어"
                maxLength={120}
              />
              <p className="adminHint muted" style={{ marginTop: -6 }}>
                쉼표(,)로 구분해 입력하세요. 최대 8개까지 노출됩니다.
              </p>

              <label className="adminLabel" htmlFor="edit-mgr-consult">
                상담 방식 (한 줄)
              </label>
              <input
                id="edit-mgr-consult"
                className="adminPwInput"
                value={consultMethod}
                onChange={(e) => setConsultMethod(e.target.value)}
                placeholder="예: 신청 후 카카오톡으로 1:1 맞춤 상담을 진행합니다."
                maxLength={100}
              />

              <label className="adminLabel" htmlFor="edit-mgr-success">
                총 소개팅 성사 (건)
              </label>
              <input
                id="edit-mgr-success"
                type="number"
                min={0}
                className="adminPwInput"
                value={successCount}
                onChange={(e) => setSuccessCount(Number(e.target.value))}
              />

              <label className="adminLabel" htmlFor="edit-mgr-photo">
                프로필 사진 바꾸기 (선택)
              </label>
              <input
                id="edit-mgr-photo"
                type="file"
                accept="image/*"
                className="adminPwInput"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              {saveError ? <p className="adminError">{saveError}</p> : null}

              <button type="submit" className="submitBtn adminLoginBtn" disabled={busy}>
                {busy ? '저장 중…' : '저장'}
              </button>
            </form>
          )}

          <p className="adminBack" style={{ marginTop: 20 }}>
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <Link to="/admin/managers">매니저 목록</Link>
            {' > '}
            <span>매니저 수정</span>
          </p>
        </div>
      </main>
    </div>
  )
}
