import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REVIEWS_DATA_PATH = join(__dirname, 'data', 'reviews.json')

/** @typedef {{ id: number; title: string; subtitle: string; summary: string; body: string; previewTone: string; photoFile: string; pinned: boolean; published: boolean; createdAt: string; updatedAt: string }} ReviewRow */

const PREVIEW_TONES = new Set(['sky', 'rose', 'mint', 'gold', 'lavender'])

const DEFAULT_ROWS = [
  {
    title: '처음의 어색함이 두 번째 약속으로',
    subtitle: '퇴근 후 가볍게 만난 자리에서 자연스럽게 대화가 이어졌어요.',
    summary: '첫 만남 이후 바로 다음 주 약속을 잡을 만큼 편안함과 설렘이 동시에 느껴졌던 후기입니다.',
    body:
      '처음에는 서로 조금 어색했지만, 매니저님이 알려주신 대화 포인트 덕분에 금방 분위기가 풀렸어요.\n\n취미 이야기로 시작해서 일상, 가치관, 앞으로의 계획까지 자연스럽게 대화가 이어졌고, 헤어질 때는 다음 만남 이야기를 먼저 꺼내게 되더라고요.\n\n소개만 해주는 서비스가 아니라 만남까지 이어지는 흐름을 잘 만들어 준다는 점이 특히 좋았습니다.',
    previewTone: 'sky',
  },
  {
    title: '이상형보다 더 잘 맞는 사람',
    subtitle: '조건보다 대화가 더 잘 맞는 사람을 만나게 됐습니다.',
    summary: '프로필 조건만 보면 예상하지 못했던 인연이 실제 만남에서는 훨씬 잘 맞았던 경험담입니다.',
    body:
      '처음 전달받은 프로필만 봤을 때는 제 이상형과 완전히 같다고 느끼진 않았어요.\n\n그런데 직접 만나 보니 대화 템포, 생활 패턴, 가치관이 너무 잘 맞아서 오히려 더 편하고 안정적인 느낌을 받았습니다.\n\n내가 생각한 조건만 고집하지 않아도 좋은 인연이 올 수 있다는 걸 느끼게 해준 만남이었어요.',
    previewTone: 'rose',
  },
  {
    title: '만남 이후 피드백이 정말 도움이 됐어요',
    subtitle: '애프터 케어 덕분에 다음 만남이 더 편해졌습니다.',
    summary: '첫 소개 이후에도 매니저가 피드백을 정리해 줘서 다음 만남을 더 자신 있게 준비할 수 있었던 후기입니다.',
    body:
      '첫 소개 후 제가 긴장을 많이 했다는 점, 상대방이 좋게 느꼈던 점을 매니저님이 정리해서 전달해 주셨어요.\n\n덕분에 두 번째 만남 때는 훨씬 편하게 대화할 수 있었고, 저도 어떤 부분을 더 살리면 좋은지 감을 잡게 됐습니다.\n\n소개에서 끝나지 않고 관계가 이어지도록 도와준다는 점이 만족스러웠습니다.',
    previewTone: 'mint',
  },
  {
    title: '바쁜 일정 속에서도 확실한 만남',
    subtitle: '일정 조율을 직접 도와줘서 부담이 적었습니다.',
    summary: '일과가 바쁜 상황에서도 실제 만남까지 이어질 수 있었던 이유를 담은 후기입니다.',
    body:
      '혼자서 소개를 받으면 일정 맞추다가 흐지부지 끝나는 경우가 많았는데, 이번에는 시간 조율을 도와줘서 훨씬 수월했어요.\n\n상대방도 진지하게 만남에 임하고 있다는 느낌을 받아서 한 번의 만남이 더 의미 있게 다가왔습니다.\n\n바쁜 직장인에게 특히 잘 맞는 서비스라고 느꼈습니다.',
    previewTone: 'gold',
  },
  {
    title: '프로필보다 실제가 더 좋았던 소개',
    subtitle: '신뢰도 높은 소개라는 말이 왜 필요한지 느꼈습니다.',
    summary: '사진이나 프로필 설명과 실제 만남 사이의 간극이 적어 만족도가 높았던 후기입니다.',
    body:
      '기존 소개팅 앱에서는 프로필과 실제 인상이 많이 다른 경우가 있었는데, 이번에는 그런 걱정이 거의 없었어요.\n\n상대방도 성실하고 예의 바른 분이었고, 프로필에 적힌 내용도 실제와 크게 다르지 않았습니다.\n\n이런 기본적인 신뢰가 있어야 다음 만남도 자연스럽게 이어진다는 걸 느꼈습니다.',
    previewTone: 'lavender',
  },
  {
    title: '가볍지 않은 만남을 찾는 분께 추천',
    subtitle: '연락의 온도부터 다르게 느껴졌습니다.',
    summary: '단순한 소개가 아니라 서로 진지한 전제로 대화를 나누고 싶은 분에게 맞았던 후기입니다.',
    body:
      '소개를 받고 나서 바로 느낀 건 연락의 결이 가볍지 않다는 점이었어요.\n\n서로 어떤 만남을 원하는지 분명하게 알고 있어서 대화도 훨씬 진지했고, 괜한 소모 없이 서로를 알아갈 수 있었습니다.\n\n가벼운 채팅보다 실제 인연을 원하는 분이라면 만족도가 높을 것 같아요.',
    previewTone: 'sky',
  },
  {
    title: '매니저 소통이 큰 차이를 만들었어요',
    subtitle: '혼자였다면 놓쳤을 만남을 이어줬습니다.',
    summary: '만남 전후 매니저의 중간 조율이 관계를 이어가는 데 실제로 도움이 됐던 후기입니다.',
    body:
      '첫 만남 뒤에 서로 조금 조심스러운 부분이 있었는데, 매니저님이 중간에서 분위기를 잘 풀어주셨어요.\n\n덕분에 오해 없이 다시 대화를 이어갈 수 있었고, 결국 두 번째 만남까지 자연스럽게 연결됐습니다.\n\n혼자였으면 그냥 끝났을 수도 있는 인연을 이어준 느낌이었습니다.',
    previewTone: 'mint',
  },
  {
    title: '조건도 중요하지만 대화가 더 중요했어요',
    subtitle: '소개 전 상담이 꼼꼼해서 만족했습니다.',
    summary: '상담 단계에서 원하는 만남 방향을 충분히 정리한 덕분에 실제 소개 만족도가 높았던 후기입니다.',
    body:
      '상담 때 단순히 외적인 조건만 묻는 게 아니라 대화 스타일, 성격, 가치관을 많이 물어봐서 인상적이었어요.\n\n그래서인지 만났을 때 억지로 맞춘 느낌이 아니라 자연스럽게 대화가 잘 이어졌습니다.\n\n처음 상담이 꼼꼼할수록 결과도 좋아진다는 걸 느꼈습니다.',
    previewTone: 'rose',
  },
  {
    title: '소개 후가 더 중요하다는 걸 느꼈습니다',
    subtitle: '한 번의 만남을 다음으로 이어주는 과정이 좋았어요.',
    summary: '소개 직후보다 그 다음 관계를 이어 주는 관리 과정이 특히 만족스러웠던 후기입니다.',
    body:
      '첫 소개 자체도 좋았지만, 이후에 피드백과 다음 액션을 정리해 주는 과정이 정말 도움이 됐어요.\n\n만남이 끝나면 각자 알아서 하라는 방식이 아니라 흐름을 계속 이어갈 수 있도록 도와준다는 점이 다르게 느껴졌습니다.\n\n결국 그 부분이 실제 커플 성사율에 영향을 주는 것 같아요.',
    previewTone: 'gold',
  },
  {
    title: '내 속도에 맞는 소개라서 편했습니다',
    subtitle: '부담 없이 시작했는데 진지한 만남으로 이어졌어요.',
    summary: '처음부터 큰 부담 없이 시작했지만 결과적으로는 충분히 진지한 만남으로 이어진 후기입니다.',
    body:
      '결혼정보회사처럼 무겁지는 않지만, 그렇다고 가볍지도 않은 그 중간 지점이 정말 편했어요.\n\n제 속도에 맞춰 대화를 시작하고, 만나고, 다시 관계를 이어가다 보니 부담이 적었습니다.\n\n자연스럽고 진지한 만남을 원하는 분께 추천하고 싶습니다.',
    previewTone: 'lavender',
  },
]

function normalizeTone(value) {
  const tone = String(value || '').trim()
  return PREVIEW_TONES.has(tone) ? tone : 'sky'
}

function seedRows() {
  return DEFAULT_ROWS.map((row, idx) => {
    const now = new Date(Date.now() - idx * 86400000).toISOString()
    return {
      id: idx + 1,
      title: row.title,
      subtitle: row.subtitle,
      summary: row.summary,
      body: row.body,
      previewTone: normalizeTone(row.previewTone),
      photoFile: '',
      pinned: idx < 2,
      published: true,
      createdAt: now,
      updatedAt: now,
    }
  })
}

function normalizeRow(row) {
  const title = String(row?.title || '').trim()
  const subtitle = String(row?.subtitle || '').trim()
  const summary = String(row?.summary || '').trim()
  const body = String(row?.body || '').trim()
  const photoFile = String(row?.photoFile || '').trim()
  const createdAt = String(row?.createdAt || '').trim() || new Date().toISOString()
  const updatedAt = String(row?.updatedAt || '').trim() || createdAt
  return {
    id: Number(row?.id) || 0,
    title,
    subtitle,
    summary,
    body,
    previewTone: normalizeTone(row?.previewTone),
    photoFile,
    pinned: Boolean(row?.pinned),
    published: row?.published !== false,
    createdAt,
    updatedAt,
  }
}

/** @returns {{ reviews: ReviewRow[] }} */
export function loadReviewsDb() {
  if (!existsSync(REVIEWS_DATA_PATH)) {
    const reviews = seedRows()
    saveReviewsDb({ reviews })
    return { reviews }
  }
  try {
    const raw = readFileSync(REVIEWS_DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.reviews)) {
      const reviews = seedRows()
      saveReviewsDb({ reviews })
      return { reviews }
    }
    const reviews = parsed.reviews.map(normalizeRow).filter((x) => x.id > 0 && x.title && x.body)
    if (reviews.length === 0) {
      const next = seedRows()
      saveReviewsDb({ reviews: next })
      return { reviews: next }
    }
    return { reviews }
  } catch {
    const reviews = seedRows()
    saveReviewsDb({ reviews })
    return { reviews }
  }
}

/** @param {{ reviews: ReviewRow[] }} data */
export function saveReviewsDb(data) {
  mkdirSync(dirname(REVIEWS_DATA_PATH), { recursive: true })
  writeFileSync(REVIEWS_DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function sortReviews(rows) {
  return rows.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.id - a.id
  })
}

export function listReviewsPublic() {
  const { reviews } = loadReviewsDb()
  return sortReviews(reviews)
    .filter((x) => x.published)
    .map((x) => ({
      id: x.id,
      title: x.title,
      subtitle: x.subtitle,
      summary: x.summary,
      previewTone: x.previewTone,
      hasPhoto: Boolean(x.photoFile),
      pinned: x.pinned,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    }))
}

export function listReviewsAdmin() {
  const { reviews } = loadReviewsDb()
  return sortReviews(reviews).map((x) => ({
    id: x.id,
    title: x.title,
    subtitle: x.subtitle,
    summary: x.summary,
    previewTone: x.previewTone,
    hasPhoto: Boolean(x.photoFile),
    pinned: x.pinned,
    published: x.published,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  }))
}

/** @param {string|number} id */
export function getReviewById(id) {
  const { reviews } = loadReviewsDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  return reviews.find((x) => x.id === n) ?? null
}

/** @param {{ title: string; subtitle?: string; summary: string; body: string; previewTone?: string; photoFile?: string; pinned?: boolean; published?: boolean }} row */
export function insertReview(row) {
  const db = loadReviewsDb()
  const title = String(row?.title || '').trim()
  const subtitle = String(row?.subtitle || '').trim()
  const summary = String(row?.summary || '').trim()
  const body = String(row?.body || '').trim()
  if (!title) throw new Error('empty title')
  if (!summary) throw new Error('empty summary')
  if (!body) throw new Error('empty body')
  const now = new Date().toISOString()
  const nextId = db.reviews.reduce((m, x) => Math.max(m, x.id), 0) + 1
  const review = {
    id: nextId,
    title,
    subtitle,
    summary,
    body,
    previewTone: normalizeTone(row?.previewTone),
    photoFile: String(row?.photoFile || '').trim(),
    pinned: Boolean(row?.pinned),
    published: row?.published !== false,
    createdAt: now,
    updatedAt: now,
  }
  db.reviews.push(review)
  saveReviewsDb(db)
  return review
}

/** @param {string|number} id @param {{ title?: string; subtitle?: string; summary?: string; body?: string; previewTone?: string; photoFile?: string; pinned?: boolean; published?: boolean }} patch */
export function updateReviewRow(id, patch) {
  const db = loadReviewsDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const idx = db.reviews.findIndex((x) => x.id === n)
  if (idx === -1) return null
  const prev = db.reviews[idx]
  const title = patch.title !== undefined ? String(patch.title || '').trim() : prev.title
  const subtitle = patch.subtitle !== undefined ? String(patch.subtitle || '').trim() : prev.subtitle
  const summary = patch.summary !== undefined ? String(patch.summary || '').trim() : prev.summary
  const body = patch.body !== undefined ? String(patch.body || '').trim() : prev.body
  if (!title || !summary || !body) return null
  db.reviews[idx] = {
    ...prev,
    title,
    subtitle,
    summary,
    body,
    previewTone: patch.previewTone !== undefined ? normalizeTone(patch.previewTone) : prev.previewTone,
    photoFile: patch.photoFile !== undefined ? String(patch.photoFile || '').trim() : prev.photoFile,
    pinned: patch.pinned !== undefined ? Boolean(patch.pinned) : prev.pinned,
    published: patch.published !== undefined ? Boolean(patch.published) : prev.published,
    updatedAt: new Date().toISOString(),
  }
  saveReviewsDb(db)
  return db.reviews[idx]
}

/** @param {string|number} id */
export function deleteReviewById(id) {
  const db = loadReviewsDb()
  const n = Number(id)
  if (!Number.isFinite(n)) return false
  const idx = db.reviews.findIndex((x) => x.id === n)
  if (idx === -1) return false
  db.reviews.splice(idx, 1)
  saveReviewsDb(db)
  return true
}
