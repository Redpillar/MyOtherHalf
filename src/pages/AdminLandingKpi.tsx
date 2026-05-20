import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import {
  DEFAULT_LANDING_KPI,
  LANDING_KPI_LABELS,
  type LandingKpiStats,
} from '../landing/landingKpiTypes'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

type FieldKey = keyof LandingKpiStats

const FIELDS: { key: FieldKey; label: string; hint: string; max: number }[] = [
  { key: 'cumulativeMembers', label: LANDING_KPI_LABELS[0], hint: '메인 KPI 첫 번째 숫자', max: 99_999_999 },
  { key: 'cumulativeCouples', label: LANDING_KPI_LABELS[1], hint: '메인 KPI 두 번째 숫자', max: 99_999_999 },
  { key: 'inProgress', label: LANDING_KPI_LABELS[2], hint: '메인 KPI 세 번째 숫자', max: 99_999_999 },
  { key: 'successRate', label: LANDING_KPI_LABELS[3], hint: '0~100 사이 정수 (표시: NN%)', max: 100 },
]

export function AdminLandingKpi() {
  const token = useAdminToken()
  const [draft, setDraft] = useState<LandingKpiStats>(DEFAULT_LANDING_KPI)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const t = token
    if (!t) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/landing-kpi')
      const j = await readJsonResponse<{ kpi?: LandingKpiStats; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      if (j.kpi) setDraft(j.kpi)
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const t = token
    if (!t) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const r = await apiFetch('/api/admin/landing-kpi', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      })
      const j = await readJsonResponse<{ kpi?: LandingKpiStats; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '저장하지 못했습니다.')
      if (j.kpi) setDraft(j.kpi)
      setMessage('메인 KPI가 저장되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner" style={{ maxWidth: 560 }}>
          <div className="adminHead">
            <h1 className="adminTitle">메인 KPI</h1>
            <p className="adminHint muted">
              메인 페이지 상단 KPI 바에 표시되는 누적 가입자, 누적 커플, 진행중, 성사율 수치를 수정합니다.
            </p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : loading ? (
            <p className="adminLoading">불러오는 중…</p>
          ) : (
            <form className="adminLoginCard card" style={{ maxWidth: '100%' }} onSubmit={(ev) => void onSubmit(ev)}>
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="adminLabel" htmlFor={`landing-kpi-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`landing-kpi-${field.key}`}
                    type="number"
                    min={0}
                    max={field.max}
                    className="adminPwInput"
                    value={draft[field.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }))
                    }
                    required
                  />
                  <p className="adminHint muted" style={{ marginTop: 6, marginBottom: 14 }}>
                    {field.hint}
                  </p>
                </div>
              ))}

              {error ? <p className="adminError">{error}</p> : null}
              {message ? (
                <p style={{ margin: 0, color: '#047857', fontWeight: 700, fontSize: 14 }}>{message}</p>
              ) : null}

              <button type="submit" className="submitBtn adminLoginBtn" disabled={busy}>
                {busy ? '저장 중…' : '저장'}
              </button>
            </form>
          )}

          <p className="adminBack" style={{ marginTop: 20 }}>
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' > '}
            <span>메인 KPI</span>
          </p>
        </div>
      </main>
    </div>
  )
}
