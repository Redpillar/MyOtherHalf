import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RecommendTone } from '../lib/recommendationTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

const TONE_OPTIONS: { value: RecommendTone; label: string }[] = [
  { value: 'slate', label: 'slate' },
  { value: 'gray', label: 'gray' },
  { value: 'blue', label: 'blue' },
  { value: 'pink', label: 'pink' },
  { value: 'purple', label: 'purple' },
]

export function AdminRecommendationCreate() {
  const navigate = useNavigate()
  const token = useAdminToken()
  const [quote, setQuote] = useState('')
  const [tone, setTone] = useState<RecommendTone>('gray')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    const t = token
    if (!t) return
    const q = quote.trim()
    if (!q) return setError('문구를 입력해 주세요.')

    setSaving(true)
    setError(null)
    try {
      const r = await apiFetch('/api/admin/recommendations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quote: q, tone }),
      })
      const j = await readJsonResponse<{ error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '추가하지 못했습니다.')
      window.alert('저장되었습니다.')
      navigate('/admin/recommendations', { replace: true })
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
          <AdminMenu />

          <div className="adminDetailHead">
            <button type="button" className="adminDetailBackBtn" onClick={() => navigate('/admin/recommendations')}>
              ← 문구 목록
            </button>
            <div className="adminHead" style={{ marginTop: 12 }}>
              <h1 className="adminTitle">문구 추가</h1>
              <p className="adminHint muted">메인 페이지 추천 캐러셀에 노출될 문구를 추가합니다.</p>
            </div>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <form className="adminSettingsCard card" onSubmit={(ev) => void onAdd(ev)}>
              <label className="adminLabel" htmlFor="rec-quote">
                문구
              </label>
              <textarea
                id="rec-quote"
                className="adminDetailTextarea"
                rows={6}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                maxLength={800}
                placeholder="추천 카드에 표시할 문구"
                required
              />

              <label className="adminLabel" htmlFor="rec-tone" style={{ marginTop: 12 }}>
                카드 색(톤)
              </label>
              <select
                id="rec-tone"
                className="adminPwInput"
                value={tone}
                onChange={(e) => setTone(e.target.value as RecommendTone)}
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {error ? <p className="adminError">{error}</p> : null}
              <button type="submit" className="submitBtn adminLoginBtn" style={{ marginTop: 16 }} disabled={saving}>
                {saving ? '저장 중…' : '추가'}
              </button>
            </form>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <Link to="/admin/recommendations">랜딩 추천 문구</Link>
            {' > '}
            <span>문구 추가</span>
          </p>
        </div>
      </main>
    </div>
  )
}

