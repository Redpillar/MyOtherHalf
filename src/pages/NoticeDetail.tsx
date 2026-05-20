import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isNoticeNew, type PublicNoticeDetail } from '../notice/noticeTypes'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'
import './notices.scss'

export function NoticeDetail() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<PublicNoticeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) {
      setLoading(false)
      setError('잘못된 공지 경로입니다.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch(`/api/notices/${encodeURIComponent(id)}`)
      const j = await readJsonResponse<{ notice?: PublicNoticeDetail; error?: string }>(r)
      if (r.status === 404) {
        setRow(null)
        setError(j.error || '공지사항을 찾을 수 없습니다.')
        return
      }
      if (!r.ok) throw new Error(j.error || '공지사항을 불러오지 못했습니다.')
      if (!j.notice) throw new Error('데이터가 없습니다.')
      setRow(j.notice)
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
    <div className="noticePage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="noticeHero">
          <div className="container noticeHeroInner">
            <h1 className="noticeHeroTitle">공지사항</h1>
            <p className="noticeHeroLead">서비스 운영 소식과 주요 안내를 확인하세요.</p>
          </div>
        </section>

        <div className="container signupInner noticeDetailWrap">
          <p className="noticeBackRow">
            <Link to="/notices" className="navLink" style={{ fontWeight: 800 }}>
              ← 공지사항 목록
            </Link>
          </p>

          {loading ? <p className="adminLoading">불러오는 중…</p> : null}
          {error ? <p className="adminError">{error}</p> : null}

          {!loading && !error && row ? (
            <article className="card noticeDetailCard">
              <div className="noticeCardMeta">
                <div className="noticeCardDates">
                  <span className="noticeDate">등록일 {new Date(row.createdAt).toLocaleString('ko-KR')}</span>
                  {row.updatedAt !== row.createdAt ? (
                    <span className="noticeDate">수정일 {new Date(row.updatedAt).toLocaleString('ko-KR')}</span>
                  ) : null}
                </div>
                {row.pinned || isNoticeNew(row.createdAt) ? (
                  <div className="noticeCardBadges">
                    {row.pinned ? <span className="noticeBadge">중요</span> : null}
                    {isNoticeNew(row.createdAt) ? (
                      <span className="noticeBadge noticeBadge--new">NEW</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <h2 className="noticeDetailTitle">{row.title}</h2>
              <pre className="noticeBody">{row.body}</pre>
            </article>
          ) : null}
        </div>
      </main>
    </div>
  )
}
