import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const RECOMMENDATIONS_DATA_PATH = join(__dirname, 'data', 'recommendations.json')

/** @typedef {{ id: number; quote: string; tone: string }} RecommendationRow */

const TONES = new Set(['gray', 'blue', 'pink', 'purple', 'slate'])

const DEFAULT_ROWS = [
  {
    tone: 'slate',
    quote:
      '앱 안에서만 스쳐 가는 만남이 아니라, 진지하게 이어질 인연을 원하는데 제대로 된 소개팅을 찾기 어려워요.',
  },
  {
    tone: 'gray',
    quote: '진지한 만남을 원하는 사람이 없고, 좋은 인연 찾는 소개팅 찾기가 힘들어요.',
  },
  {
    tone: 'blue',
    quote: '데이팅앱 이것저것 많이 써봤는데 매칭이 되어도 금방 연락이 끊기더라구요.',
  },
  {
    tone: 'pink',
    quote: '결혼정보회사는 매칭비, 성혼비, 상담비 금액적인 부분이 너무 부담돼요.',
  },
  {
    tone: 'purple',
    quote: '진지한 만남만 생각하는데, 주변에서는 소개를 받기 어렵고 시간만 가고 있어요.',
  },
]

function normalizeTone(t) {
  const v = String(t || '').trim()
  return TONES.has(v) ? v : 'gray'
}

function normalizeRow(r) {
  return {
    id: Number(r.id) || 0,
    quote: String(r.quote || '').trim(),
    tone: normalizeTone(r.tone),
  }
}

function seedItems() {
  return DEFAULT_ROWS.map((row, idx) => ({
    id: idx + 1,
    quote: row.quote,
    tone: row.tone,
  }))
}

/** @returns {{ items: RecommendationRow[] }} */
export function loadRecommendationsDb() {
  if (!existsSync(RECOMMENDATIONS_DATA_PATH)) {
    const items = seedItems()
    saveRecommendationsDb({ items })
    return { items }
  }
  try {
    const raw = readFileSync(RECOMMENDATIONS_DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.items)) {
      const items = seedItems()
      saveRecommendationsDb({ items })
      return { items }
    }
    const items = parsed.items.map(normalizeRow).filter((x) => x.id > 0 && x.quote.length > 0)
    if (items.length === 0) {
      const next = seedItems()
      saveRecommendationsDb({ items: next })
      return { items: next }
    }
    return { items }
  } catch {
    const items = seedItems()
    saveRecommendationsDb({ items })
    return { items }
  }
}

/** @param {{ items: RecommendationRow[] }} data */
export function saveRecommendationsDb(data) {
  mkdirSync(dirname(RECOMMENDATIONS_DATA_PATH), { recursive: true })
  writeFileSync(RECOMMENDATIONS_DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function listRecommendationsPublic() {
  const { items } = loadRecommendationsDb()
  return items.slice().map(({ id, quote, tone }) => ({ id, quote, tone }))
}

/** @param {number[]} orderedIds 저장 파일에 넣을 순서(기존 id 전부·중복 없음) */
export function reorderRecommendations(orderedIds) {
  const db = loadRecommendationsDb()
  if (!Array.isArray(orderedIds) || orderedIds.length !== db.items.length) return false
  const idSet = new Set(db.items.map((x) => x.id))
  const seen = new Set()
  for (const raw of orderedIds) {
    const id = Number(raw)
    if (!Number.isFinite(id) || !idSet.has(id) || seen.has(id)) return false
    seen.add(id)
  }
  if (seen.size !== idSet.size) return false
  const byId = new Map(db.items.map((x) => [x.id, x]))
  db.items = orderedIds.map((id) => byId.get(Number(id)))
  saveRecommendationsDb(db)
  return true
}

/** @param {{ quote: string; tone: string }} row */
export function insertRecommendation(row) {
  const db = loadRecommendationsDb()
  const quote = String(row.quote || '').trim()
  if (!quote) throw new Error('empty quote')
  const nextId = db.items.reduce((m, x) => Math.max(m, x.id), 0) + 1
  const item = { id: nextId, quote, tone: normalizeTone(row.tone) }
  db.items.push(item)
  saveRecommendationsDb(db)
  return item
}

/** @param {string|number} id */
export function deleteRecommendationById(id) {
  const db = loadRecommendationsDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return false
  const i = db.items.findIndex((x) => x.id === n)
  if (i === -1) return false
  db.items.splice(i, 1)
  saveRecommendationsDb(db)
  return true
}
