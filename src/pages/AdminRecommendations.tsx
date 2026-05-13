import { type DragEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RecommendTone, RecommendationItem } from '../lib/recommendationTypes'
import { clearAdminToken, useAdminToken } from '../admin/adminSession'
import { AdminMenu } from '../components/AdminMenu'
import { SiteHeader } from '../components/SiteHeader'
import { apiFetch, readJsonResponse } from '../lib/apiFetch'
import './admin.scss'

function apiErrorMessage(r: Response, j: { error?: string; path?: string }, fallback: string) {
  const msg = typeof j.error === 'string' && j.error.trim() ? j.error.trim() : fallback
  if (
    r.status === 404 &&
    typeof j.path === 'string' &&
    j.path.includes('recommendations') &&
    msg.includes('요청한 API를 찾을 수 없습니다')
  ) {
    return `${msg} 로컬 API(8787)가 예전 버전으로 떠 있을 수 있습니다. 터미널에서 npm run dev를 한 번 종료한 뒤 다시 실행해 주세요.`
  }
  return msg
}

const TONE_OPTIONS: { value: RecommendTone; label: string }[] = [
  { value: 'slate', label: 'slate' },
  { value: 'gray', label: 'gray' },
  { value: 'blue', label: 'blue' },
  { value: 'pink', label: 'pink' },
  { value: 'purple', label: 'purple' },
]

const DND_MIME = 'application/x-demo-rec-id'

export function AdminRecommendations() {
  const token = useAdminToken()
  const [items, setItems] = useState<RecommendationItem[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState('')
  const [tone, setTone] = useState<RecommendTone>('gray')
  const [saving, setSaving] = useState(false)
  const [orderSaving, setOrderSaving] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const t = token
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/admin/recommendations', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ items?: RecommendationItem[]; error?: string; path?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        setItems([])
        return
      }
      if (!r.ok) throw new Error(apiErrorMessage(r, j, '목록을 불러오지 못했습니다.'))
      setItems(Array.isArray(j.items) ? j.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const persistOrder = useCallback(
    async (next: RecommendationItem[]) => {
      const t = token
      if (!t) return
      setOrderSaving(true)
      setError(null)
      try {
        const r = await apiFetch('/api/admin/recommendations/order', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${t}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: next.map((x) => x.id) }),
        })
        const j = await readJsonResponse<{ items?: RecommendationItem[]; error?: string; path?: string }>(r)
        if (r.status === 401) {
          clearAdminToken()
          setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
          return
        }
        if (!r.ok) throw new Error(apiErrorMessage(r, j, '순서를 저장하지 못했습니다.'))
        setItems(Array.isArray(j.items) ? j.items : next)
      } catch (e) {
        setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
        await load()
      } finally {
        setOrderSaving(false)
      }
    },
    [token, load],
  )

  const applyReorder = useCallback(
    (fromId: number, toId: number) => {
      if (fromId === toId) return
      const prev = itemsRef.current
      const fromRow = prev.find((x) => x.id === fromId)
      if (!fromRow) return
      const without = prev.filter((x) => x.id !== fromId)
      const j = without.findIndex((x) => x.id === toId)
      if (j < 0) return
      const next = [...without.slice(0, j), fromRow, ...without.slice(j)]
      setItems(next)
      void persistOrder(next)
    },
    [persistOrder],
  )

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    const t = token
    if (!t) return
    const q = quote.trim()
    if (!q) {
      setError('문구를 입력해 주세요.')
      return
    }
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
      const j = await readJsonResponse<{ item?: RecommendationItem; error?: string; path?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(apiErrorMessage(r, j, '추가하지 못했습니다.'))
      setQuote('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: number) => {
    const t = token
    if (!t) return
    if (!window.confirm('이 문구를 삭제할까요?')) return
    setError(null)
    try {
      const r = await apiFetch(`/api/admin/recommendations/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      })
      const j = await readJsonResponse<{ error?: string; path?: string }>(r)
      if (r.status === 401) {
        clearAdminToken()
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      if (!r.ok) throw new Error(apiErrorMessage(r, j, '삭제하지 못했습니다.'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.')
    }
  }

  const rowDragClass = (rowId: number) => {
    if (dragId === rowId) return 'adminRecDragRow adminRecDragRow--dragging'
    if (overId === rowId) return 'adminRecDragRow adminRecDragOver'
    return 'adminRecDragRow'
  }

  const onRowDragStart = (rowId: number) => (e: DragEvent<HTMLTableRowElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    const s = String(rowId)
    e.dataTransfer.setData(DND_MIME, s)
    try {
      e.dataTransfer.setData('text/plain', s)
    } catch {
      /* Safari 등 */
    }
    setDragId(rowId)
  }

  const onRowDragEnd = () => {
    setDragId(null)
    setOverId(null)
  }

  const onRowDragOver = (rowId: number) => (e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragId !== null && rowId !== dragId) setOverId(rowId)
  }

  const onRowDragLeave = (rowId: number) => (e: DragEvent<HTMLTableRowElement>) => {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setOverId((o) => (o === rowId ? null : o))
  }

  const onRowDrop = (targetId: number) => (e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData('text/plain')
    const fromId = Number(raw)
    setDragId(null)
    setOverId(null)
    if (!Number.isFinite(fromId)) return
    applyReorder(fromId, targetId)
  }

  return (
    <div className="adminPage">
      <SiteHeader />

      <main className="adminMain">
        <div className="container adminInner">
          <AdminMenu />

          <div className="adminHead">
            <h1 className="adminTitle">랜딩 추천 문구</h1>
            <p className="adminHint muted">
              메인 페이지 「이런 분들께 추천드립니다」 캐러셀에 노출되는 문구를 추가·삭제합니다. 행을 드래그하면 순서를 바꿀 수
              있습니다.
            </p>
          </div>

          {!token ? (
            <p className="adminError">
              로그인이 필요합니다. <Link to="/admin">관리자 로그인</Link>
            </p>
          ) : (
            <>
              <form className="adminSettingsCard card" style={{ marginBottom: 20 }} onSubmit={(ev) => void onAdd(ev)}>
                <h2 className="adminSettingsSectionTitle">문구 추가</h2>
                <label className="adminLabel" htmlFor="rec-quote">
                  문구
                </label>
                <textarea
                  id="rec-quote"
                  className="adminDetailTextarea"
                  rows={4}
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  maxLength={800}
                  placeholder="추천 카드에 표시할 문구"
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
                <button type="submit" className="submitBtn adminLoginBtn" style={{ marginTop: 16 }} disabled={saving}>
                  {saving ? '저장 중…' : '추가'}
                </button>
              </form>

              <div className="adminToolbar">
                <span className="adminCount">
                  총 <strong>{items.length}</strong>건
                  {orderSaving ? <span className="muted"> · 순서 저장 중…</span> : null}
                </span>
                <button type="button" className="linkBtn adminRefresh" onClick={() => void load()}>
                  새로고침
                </button>
              </div>
              {error ? <p className="adminError">{error}</p> : null}
              {loading ? <p className="adminLoading">불러오는 중…</p> : null}

              <div className="adminTableWrap">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th aria-label="순서 변경" style={{ width: 44 }} />
                      <th>ID</th>
                      <th>톤</th>
                      <th>문구</th>
                      <th aria-label="삭제" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="adminEmpty">
                          등록된 문구가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr
                          key={row.id}
                          draggable
                          className={rowDragClass(row.id)}
                          onDragStart={onRowDragStart(row.id)}
                          onDragEnd={onRowDragEnd}
                          onDragOver={onRowDragOver(row.id)}
                          onDragLeave={onRowDragLeave(row.id)}
                          onDrop={onRowDrop(row.id)}
                        >
                          <td title="드래그하여 순서 변경" aria-label="순서 변경" style={{ userSelect: 'none' }}>
                            <span style={{ color: 'rgba(15,23,42,0.35)', letterSpacing: '-2px' }}>⋮⋮</span>
                          </td>
                          <td>{row.id}</td>
                          <td>{row.tone}</td>
                          <td style={{ maxWidth: 480, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.quote}</td>
                          <td>
                            <button type="button" className="linkBtn" onClick={() => void onDelete(row.id)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="adminBack">
            <Link to="/admin/dashboard">← 관리자 홈</Link>
            {' · '}
            <Link to="/">메인</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
