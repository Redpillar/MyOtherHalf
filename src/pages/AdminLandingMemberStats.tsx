import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import {
  DEFAULT_LANDING_MEMBER_STATS,
  formatGenderRatio,
  formatMemberCount,
  type LandingMemberStats,
} from '../landing/landingMemberStatsTypes'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

export function AdminLandingMemberStats() {
  const token = useAdminToken()
  const [draft, setDraft] = useState<LandingMemberStats>(DEFAULT_LANDING_MEMBER_STATS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const ratioPreview = useMemo(
    () => formatGenderRatio(draft.maleMembers, draft.femaleMembers),
    [draft.maleMembers, draft.femaleMembers],
  )

  const load = useCallback(async () => {
    const t = token
    if (!t) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/landing-member-stats')
      const j = await readJsonResponse<{ stats?: LandingMemberStats; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '불러오지 못했습니다.')
      if (j.stats) setDraft(j.stats)
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
      const r = await apiFetch('/api/admin/landing-member-stats', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      })
      const j = await readJsonResponse<{ stats?: LandingMemberStats; error?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(j.error || '저장하지 못했습니다.')
      if (j.stats) setDraft(j.stats)
      setMessage('메인 회원 현황이 저장되었습니다.')
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
            <h1 className="adminTitle">메인 회원 현황</h1>
            <p className="adminHint muted">
              메인 페이지 「내반쪽 회원 현황」의 남성·여성 회원 수와 성비 표시를 수정합니다. 성비는 입력한 인원으로
              자동 계산됩니다.
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
              <div>
                <label className="adminLabel" htmlFor="landing-member-male">
                  남성 회원 (명)
                </label>
                <input
                  id="landing-member-male"
                  type="number"
                  min={0}
                  max={99999999}
                  className="adminPwInput"
                  value={draft.maleMembers}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      maleMembers: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="adminLabel" htmlFor="landing-member-female">
                  여성 회원 (명)
                </label>
                <input
                  id="landing-member-female"
                  type="number"
                  min={0}
                  max={99999999}
                  className="adminPwInput"
                  value={draft.femaleMembers}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      femaleMembers: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>

              <div
                className="adminSettingsCard card"
                style={{ marginTop: 20, marginBottom: 8, padding: '14px 16px' }}
                aria-live="polite"
              >
                <p className="adminHint muted" style={{ margin: '0 0 10px' }}>
                  메인 미리보기
                </p>
                <p style={{ margin: '0 0 6px', fontWeight: 800 }}>
                  남성 회원 {formatMemberCount(draft.maleMembers)}
                </p>
                <p style={{ margin: '0 0 6px', fontWeight: 800 }}>
                  여성 회원 {formatMemberCount(draft.femaleMembers)}
                </p>
                <p style={{ margin: 0, fontWeight: 800 }}>전체 회원 남녀 성비 {ratioPreview}</p>
              </div>

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
            <span>메인 회원 현황</span>
          </p>
        </div>
      </main>
    </div>
  )
}
