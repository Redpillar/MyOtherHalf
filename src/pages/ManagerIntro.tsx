import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicManager } from '../admin/managerTypes'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch } from '../lib/apiFetch'
import { useMemberSession } from '../lib/memberSession'
import './landing.scss'
import './signup.scss'
import './managerIntro.scss'

const PAGE_SIZE = 4

function managerPhotoUrl(id: number): string {
  return `/api/managers/${encodeURIComponent(String(id))}/photo`
}

export function ManagerIntro() {
  const member = useMemberSession()
  const [managers, setManagers] = useState<PublicManager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/managers')
      const j = (await r.json()) as { managers?: PublicManager[]; error?: string }
      if (!r.ok) throw new Error(j.error || '목록을 불러오지 못했습니다.')
      setManagers(Array.isArray(j.managers) ? j.managers : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setManagers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(managers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages)
    const start = (p - 1) * PAGE_SIZE
    return managers.slice(start, start + PAGE_SIZE)
  }, [managers, page, totalPages])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className="managerIntroPage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="managerHero" aria-labelledby="manager-hero-title">
          <div className="container managerHeroInner">
            <h1 id="manager-hero-title" className="managerHeroTitle">
              매니저 소개
            </h1>
            <p className="managerHeroLead">
              내반쪽 전담 매니저를 소개합니다. 상담 신청 후 회원님께 맞는 매니저가 연결됩니다.
            </p>
          </div>
        </section>

        <div className="container managerMain">
          {error ? <p className="managerError">{error}</p> : null}
          {loading ? (
            <p className="muted" style={{ textAlign: 'center', fontWeight: 600 }}>
              불러오는 중…
            </p>
          ) : managers.length === 0 ? (
            <div className="managerEmpty">등록된 매니저가 없습니다. 잠시 후 다시 확인해 주세요.</div>
          ) : (
            <>
              <div className="managerGrid">
                {pageSlice.map((m) => (
                  <article key={m.id} className="managerCard">
                    <div className="managerCardImgWrap">
                      {m.hasPhoto ? (
                        <img className="managerCardImg" src={managerPhotoUrl(m.id)} alt={`${m.name} 매니저`} />
                      ) : (
                        <div className="managerCardImg" aria-hidden style={{ background: '#cbd5e1' }} />
                      )}
                    </div>
                    <div className="managerCardBody">
                      <h2 className="managerCardName">{m.name}</h2>
                      {m.intro ? <p className="managerCardIntro">{m.intro}</p> : null}
                      {m.tags.length > 0 ? (
                        <div className="managerCardTags">
                          {m.tags.map((tag) => (
                            <span key={tag} className="managerCardTag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {m.consultMethod ? (
                        <p className="managerCardConsult">{m.consultMethod}</p>
                      ) : null}
                      <div className="managerStat">
                        <span>총 소개팅 성사</span>
                        <span className="managerStatVal">{m.successCount}건</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <section className="managerCta card" aria-labelledby="manager-cta-title">
                <h2 id="manager-cta-title" className="managerCtaTitle">
                  전담 매니저와 상담을 시작해 보세요
                </h2>
                <p className="managerCtaLead">
                  매니저는 회원님 프로필과 상담 내용을 바탕으로 배정됩니다.
                  <br />
                  신청 후 카카오톡으로 연락드립니다.
                </p>
                <div className="managerCtaActions">
                  {member ? (
                    <Link className="managerCtaBtn managerCtaBtn--primary" to="/consult">
                      내 마이페이지 보기
                    </Link>
                  ) : (
                    <Link className="managerCtaBtn managerCtaBtn--primary" to="/login?returnTo=/consult">
                      로그인하고 상담 신청
                    </Link>
                  )}
                </div>
              </section>

              {totalPages > 1 ? (
                <nav className="managerPagination" aria-label="페이지">
                  <button
                    type="button"
                    className="managerPageBtn"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    이전
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`managerPageBtn${n === safePage ? ' active' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="managerPageBtn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    다음
                  </button>
                </nav>
              ) : null}
            </>
          )}

          <footer className="managerFooter">
            내반쪽 · 매니저 소개
            <br />
            Copyright {new Date().getFullYear()} 내반쪽. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  )
}
