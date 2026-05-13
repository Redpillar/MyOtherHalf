import { type FormEvent, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'

export function AdminManagerRegister() {
  const token = useAdminToken()
  const [name, setName] = useState('')
  const [ratingStars, setRatingStars] = useState(5)
  const [successCount, setSuccessCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setMessage(null)
      setError(null)
      const t = token
      if (!t) {
        setError('관리자 로그인이 필요합니다.')
        return
      }
      if (!name.trim()) {
        setError('매니저 이름을 입력해 주세요.')
        return
      }
      if (!file) {
        setError('프로필 사진을 선택해 주세요.')
        return
      }
      const fd = new FormData()
      fd.set('name', name.trim())
      fd.set('ratingStars', String(ratingStars))
      fd.set('successCount', String(Math.max(0, Math.floor(successCount))))
      fd.set('reviewCount', String(Math.max(0, Math.floor(reviewCount))))
      fd.set('photo', file)
      setBusy(true)
      try {
        const r = await apiFetch('/api/admin/managers', {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` },
          body: fd,
        })
        const raw = await r.text()
        let j: { error?: string; manager?: { name?: string } } = {}
        if (raw.trim().startsWith('{')) {
          try {
            j = JSON.parse(raw) as { error?: string; manager?: { name?: string } }
          } catch {
            /* ignore */
          }
        }
        if (r.status === 401) {
          clearAdminToken()
          setError('세션이 만료되었습니다. 관리자에서 다시 로그인해 주세요.')
          return
        }
        if (!r.ok) {
          const hint =
            raw.includes('Cannot POST') || r.status === 404
              ? ' API가 예전 버전일 수 있습니다. 터미널에서 npm run dev(Vite)를 한 번 중지했다가 다시 실행해 주세요.'
              : ''
          setError((j.error || raw.replace(/\s+/g, ' ').trim().slice(0, 160) || `HTTP ${r.status}`) + hint)
          return
        }
        setMessage(`${j.manager?.name ?? name} 매니저가 등록되었습니다.`)
        setName('')
        setRatingStars(5)
        setSuccessCount(0)
        setReviewCount(0)
        setFile(null)
        e.currentTarget.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다.')
      } finally {
        setBusy(false)
      }
    },
    [name, ratingStars, successCount, reviewCount, file, token],
  )

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 520 }}>
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">매니저 등록</h1>
            <p className="adminHint muted">등록한 매니저는 매니저 소개 페이지에 노출됩니다.</p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <form className="adminLoginCard card" style={{ maxWidth: '100%' }} onSubmit={onSubmit}>
              <label className="adminLabel" htmlFor="mgr-name">
                매니저 이름 <span className="req">*</span>
              </label>
              <input
                id="mgr-name"
                className="adminPwInput"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름"
                required
              />

              <label className="adminLabel" htmlFor="mgr-photo">
                프로필 사진 <span className="req">*</span>
              </label>
              <input
                id="mgr-photo"
                type="file"
                accept="image/*"
                className="adminPwInput"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              <label className="adminLabel" htmlFor="mgr-rating">
                별점 (1~5)
              </label>
              <select
                id="mgr-rating"
                className="adminPwInput"
                value={ratingStars}
                onChange={(e) => setRatingStars(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n) + '☆'.repeat(5 - n)} ({n})
                  </option>
                ))}
              </select>

              <label className="adminLabel" htmlFor="mgr-success">
                총 소개팅 성사 (건)
              </label>
              <input
                id="mgr-success"
                type="number"
                min={0}
                className="adminPwInput"
                value={successCount}
                onChange={(e) => setSuccessCount(Number(e.target.value))}
              />

              <label className="adminLabel" htmlFor="mgr-review">
                후기 (건)
              </label>
              <input
                id="mgr-review"
                type="number"
                min={0}
                className="adminPwInput"
                value={reviewCount}
                onChange={(e) => setReviewCount(Number(e.target.value))}
              />

              {error ? <p className="adminError">{error}</p> : null}
              {message ? <p style={{ margin: 0, color: '#047857', fontWeight: 700, fontSize: 14 }}>{message}</p> : null}

              <button type="submit" className="submitBtn adminLoginBtn" disabled={busy}>
                {busy ? '등록 중…' : '매니저 등록'}
              </button>
            </form>
          )}

          <p className="adminBack" style={{ marginTop: 20 }}>
            <Link to="/admin/managers">매니저 목록</Link>
            {' · '}
            <Link to="/admin">← 관리자(회원 목록)</Link>
            {' · '}
            <Link to="/managers">매니저 소개 보기</Link>
            {' · '}
            <Link to="/">메인</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
