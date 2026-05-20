import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import type { PublicReviewDetail } from '../review/reviewTypes'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'
import './reviews-page.scss'

function reviewPhotoUrl(id: number): string {
  return `/api/reviews/${encodeURIComponent(String(id))}/photo`
}

export function ReviewDetail() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<PublicReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) {
      setLoading(false)
      setError('잘못된 후기 경로입니다.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch(`/api/reviews/${encodeURIComponent(id)}`)
      const j = await readJsonResponse<{ review?: PublicReviewDetail; error?: string }>(r)
      if (r.status === 404) {
        setRow(null)
        setError(j.error || '커플 후기를 찾을 수 없습니다.')
        return
      }
      if (!r.ok) throw new Error(j.error || '커플 후기를 불러오지 못했습니다.')
      if (!j.review) throw new Error('데이터가 없습니다.')
      setRow(j.review)
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="reviewPage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="reviewHero">
          <div className="container reviewHeroInner">
            <h1 className="reviewHeroTitle">커플 후기</h1>
            <p className="reviewHeroLead">실제 만남 이후 이어진 이야기들을 확인해 보세요.</p>
          </div>
        </section>

        <div className="container signupInner reviewDetailWrap">
          <p className="reviewBackRow">
            <Link to="/reviews" className="navLink" style={{ fontWeight: 800 }}>
              ← 커플 후기 목록
            </Link>
          </p>

          {loading ? <p className="adminLoading">불러오는 중…</p> : null}
          {error ? <p className="adminError">{error}</p> : null}

          {!loading && !error && row ? (
            <article className="card reviewDetailCard">
              <div className="reviewDetailLayout">
                <div className="reviewDetailMain">
                  <div className="reviewCardMeta">
                    {row.pinned ? <span className="reviewBadge">추천 후기</span> : null}
                    <span>등록일 {new Date(row.createdAt).toLocaleString('ko-KR')}</span>
                    {row.updatedAt !== row.createdAt ? (
                      <span>수정일 {new Date(row.updatedAt).toLocaleString('ko-KR')}</span>
                    ) : null}
                  </div>
                  <h1 className="reviewDetailTitle">{row.title}</h1>
                  <p className="reviewDetailSubtitle">{row.subtitle}</p>
                  <div className="reviewStoryBox">
                    <p className="reviewStoryLead">{row.summary}</p>
                    <pre className="reviewStoryBody">{row.body}</pre>
                  </div>
                </div>

                <aside className="reviewDetailAside">
                  {row.hasPhoto ? (
                    <img className="reviewDetailImage" src={reviewPhotoUrl(row.id)} alt={`${row.title} 후기 이미지`} />
                  ) : (
                    <div className="reviewDetailImage reviewCardImagePlaceholder">
                      <span>관리자에서 후기 이미지를 등록해 주세요.</span>
                    </div>
                  )}
                </aside>
              </div>
            </article>
          ) : null}
        </div>
      </main>
    </div>
  )
}
