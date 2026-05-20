import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import type { PublicReviewSummary } from '../review/reviewTypes'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'
import './reviews-page.scss'

const PAGE_SIZE = 12

function reviewPhotoUrl(id: number): string {
  return `/api/reviews/${encodeURIComponent(String(id))}/photo`
}

export function Reviews() {
  const [rows, setRows] = useState<PublicReviewSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/reviews')
      const j = await readJsonResponse<{ reviews?: PublicReviewSummary[]; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '커플 후기를 불러오지 못했습니다.')
      const nextRows = Array.isArray(j.reviews) ? j.reviews : []
      setRows(nextRows)
      setPage(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [page, rows])

  return (
    <div className="reviewPage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="reviewHero">
          <div className="container reviewHeroInner">
            <h1 className="reviewHeroTitle">커플 후기</h1>
            <p className="reviewHeroLead">
              실제 만남 이후 이어진 이야기들을 모았습니다. 진지한 인연을 찾는 과정이 어떻게 시작됐는지 확인해
              보세요.
            </p>
          </div>
        </section>

        <div className="container signupInner reviewListWrap">
          {error ? <p className="adminError">{error}</p> : null}
          {loading ? <p className="adminLoading">불러오는 중…</p> : null}

          {!loading && !error ? (
            rows.length === 0 ? (
              <div className="card reviewEmpty">등록된 커플 후기가 없습니다.</div>
            ) : (
              <>
                <div className="reviewGrid">
                  {visibleRows.map((row) => (
                    <article key={row.id} className="card reviewCard">
                      {row.hasPhoto ? (
                        <img className="reviewCardImage" src={reviewPhotoUrl(row.id)} alt={`${row.title} 후기 이미지`} />
                      ) : (
                        <div className="reviewCardImage reviewCardImagePlaceholder">
                          <span>관리자에서 카톡 캡처 이미지를 등록해 주세요.</span>
                        </div>
                      )}
                      <div className="reviewCardBody">
                        <div className="reviewCardMeta">
                          {row.pinned ? <span className="reviewBadge">추천 후기</span> : null}
                          <span>{new Date(row.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <h2 className="reviewCardTitle">{row.title}</h2>
                        <p className="reviewCardSubtitle">{row.subtitle}</p>
                        <p className="reviewCardSummary">{row.summary}</p>
                        <Link to={`/reviews/${row.id}`} className="reviewDetailLink">
                          상세보기
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>

                {totalPages > 1 ? (
                  <nav className="reviewPagination" aria-label="커플 후기 페이지 이동">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`reviewPageBtn ${value === page ? 'reviewPageBtnActive' : ''}`}
                        onClick={() => setPage(value)}
                        aria-current={value === page ? 'page' : undefined}
                      >
                        {value}
                      </button>
                    ))}
                  </nav>
                ) : null}
              </>
            )
          ) : null}
        </div>
      </main>
    </div>
  )
}
