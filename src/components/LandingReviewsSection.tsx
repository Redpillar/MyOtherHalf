import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicReviewSummary } from '../review/reviewTypes'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'

const PREVIEW_COUNT = 4

function reviewPhotoUrl(id: number): string {
  return `/api/reviews/${encodeURIComponent(String(id))}/photo`
}

export function LandingReviewsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [rows, setRows] = useState<PublicReviewSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await apiFetch('/api/reviews')
        const j = await readJsonResponse<{ reviews?: PublicReviewSummary[]; error?: string }>(r)
        if (!r.ok) throw new Error(j.error || '커플 후기를 불러오지 못했습니다.')
        const next = Array.isArray(j.reviews) ? j.reviews : []
        if (!cancelled) setRows(next)
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const preview = rows.slice(0, PREVIEW_COUNT)

  useEffect(() => {
    const root = sectionRef.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-landing-reveal]').forEach((el) => {
      el.setAttribute('data-visible', 'true')
    })
  }, [loading, error, preview.length])

  return (
    <section
      ref={sectionRef}
      className="section reviewsSection"
      id="reviews"
      aria-labelledby="reviews-heading"
    >
      <div className="container">
        <div className="sectionHeader center reviewsHeader" data-landing-reveal>
          <div className="reviewsEyebrow">내반쪽 커플 후기</div>
          <h2 id="reviews-heading">실제 회원님의 커플 후기</h2>
          <p className="muted reviewsLead">
            내반쪽은 검증된 회원 간의 만남과, 만남 이후 케어까지 함께합니다.
            <br />
            아래는 실제 진행 과정에서 나눠진 이야기 일부입니다.
          </p>
        </div>

        {error ? (
          <p className="muted reviewsStatus" data-landing-reveal>
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="muted reviewsStatus" data-landing-reveal>
            불러오는 중…
          </p>
        ) : null}

        {!loading && !error && preview.length === 0 ? (
          <p className="muted reviewsStatus" data-landing-reveal>
            등록된 커플 후기가 없습니다.
          </p>
        ) : null}

        {!loading && !error && preview.length > 0 ? (
          <>
            <div className="reviewsGrid" data-landing-reveal>
              {preview.map((row) => (
                <article key={row.id} className="landingReviewCard card">
                  <Link to={`/reviews/${row.id}`} className="landingReviewCardMedia">
                    {row.hasPhoto ? (
                      <img
                        className="landingReviewCardImage"
                        src={reviewPhotoUrl(row.id)}
                        alt={`${row.title} 후기 이미지`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="landingReviewCardImage landingReviewCardImage--placeholder">
                        <span>후기 이미지</span>
                      </div>
                    )}
                  </Link>
                  <div className="landingReviewCardBody">
                    <div className="landingReviewCardMeta">
                      {row.pinned ? <span className="landingReviewBadge">추천 후기</span> : null}
                      <span className="landingReviewDate">
                        {new Date(row.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <h3 className="landingReviewTitle">{row.title}</h3>
                    {row.subtitle ? <p className="landingReviewSubtitle">{row.subtitle}</p> : null}
                    <p className="landingReviewSummary muted">{row.summary}</p>
                    <Link to={`/reviews/${row.id}`} className="landingReviewLink">
                      상세보기
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <p className="reviewsMoreWrap" data-landing-reveal>
              <Link to="/reviews" className="btn landingReviewMoreBtn">
                커플 후기 더 보기
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </section>
  )
}
