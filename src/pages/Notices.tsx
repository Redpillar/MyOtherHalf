import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isNoticeNew, type PublicNoticeSummary } from '../notice/noticeTypes'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './signup.scss'
import './admin.scss'
import './notices.scss'

export function Notices() {
  const [rows, setRows] = useState<PublicNoticeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/notices')
      const j = await readJsonResponse<{ notices?: PublicNoticeSummary[]; error?: string }>(r)
      if (!r.ok) throw new Error(j.error || '공지사항을 불러오지 못했습니다.')
      setRows(Array.isArray(j.notices) ? j.notices : [])
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

  return (
    <div className="noticePage">
      <SiteHeader />

      <main className="signupMain signupMain--hero">
        <section className="noticeHero">
          <div className="container noticeHeroInner">
            <h1 className="noticeHeroTitle">공지사항</h1>
            <p className="noticeHeroLead">서비스 운영 소식과 주요 안내를 한곳에서 확인하세요.</p>
          </div>
        </section>

        <div className="container signupInner noticeListWrap">
          {error ? <p className="adminError">{error}</p> : null}
          {loading ? <p className="adminLoading">불러오는 중…</p> : null}

          {!loading && !error ? (
            <div className="noticeList">
              {rows.length === 0 ? (
                <div className="card noticeEmpty">등록된 공지사항이 없습니다.</div>
              ) : (
                rows.map((row) => (
                  <Link key={row.id} to={`/notices/${row.id}`} className="card noticeCard">
                    <div className="noticeCardMeta">
                      <span className="noticeDate">{new Date(row.createdAt).toLocaleDateString('ko-KR')}</span>
                      {row.pinned || isNoticeNew(row.createdAt) ? (
                        <div className="noticeCardBadges">
                          {row.pinned ? <span className="noticeBadge">중요</span> : null}
                          {isNoticeNew(row.createdAt) ? (
                            <span className="noticeBadge noticeBadge--new">NEW</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <h2 className="noticeCardTitle">{row.title}</h2>
                    <p className="noticeExcerpt">{row.excerpt}</p>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
