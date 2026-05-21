import express from 'express'
import cors from 'cors'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { hashPassword, verifyPassword } from './cryptoUtil.mjs'
import {
  findByUserId,
  recordMemberLogin,
  getMemberById,
  getMemberPublicById,
  insertMember,
  listMembers,
  listMembersPublic,
  updateMember,
} from './membersStore.mjs'
import {
  getManagerById,
  insertManager,
  listManagersAdmin,
  listManagersPublic,
  managerAdminDto,
  updateManagerRow,
} from './managersStore.mjs'
import {
  getInquiryById,
  insertInquiry,
  listInquiriesAdmin,
  listInquiriesPublic,
  updateInquiryRow,
} from './inquiriesStore.mjs'
import {
  deleteRecommendationById,
  insertRecommendation,
  listRecommendationsPublic,
  reorderRecommendations,
} from './recommendationsStore.mjs'
import {
  deleteNoticeById,
  getNoticeById,
  insertNotice,
  listNoticesAdmin,
  listNoticesPublic,
  updateNoticeRow,
} from './noticesStore.mjs'
import {
  deleteReviewById,
  getReviewById,
  insertReview,
  listReviewsAdmin,
  listReviewsPublic,
  updateReviewRow,
} from './reviewsStore.mjs'
import { getAdminUiSettings, setAdminUiSettings } from './adminUiSettingsStore.mjs'
import { getLandingKpi, setLandingKpi } from './landingKpiStore.mjs'
import { getLandingMemberStats, setLandingMemberStats } from './landingMemberStatsStore.mjs'
import { getSiteHeaderNavConfig, setSiteHeaderNavConfig } from './siteHeaderNavStore.mjs'
const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP_UPLOAD_DIR = join(__dirname, 'data', 'tmp_upload')
const ADMIN_SESSIONS_PATH = join(__dirname, 'data', 'admin-sessions.json')
mkdirSync(TMP_UPLOAD_DIR, { recursive: true })

const signupUpload = multer({
  dest: TMP_UPLOAD_DIR,
  limits: { fileSize: 12 * 1024 * 1024, files: 5 },
})

const managerPhotoUpload = multer({
  dest: TMP_UPLOAD_DIR,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
})

const reviewPhotoUpload = multer({
  dest: TMP_UPLOAD_DIR,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
})

const SIGNUP_PHOTO_FIELDS = [
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 },
  { name: 'photo4', maxCount: 1 },
  { name: 'photo5', maxCount: 1 },
]

function unlinkMulterFiles(files) {
  if (!files) return
  for (const key of Object.keys(files)) {
    for (const f of files[key] || []) {
      try {
        if (f?.path && existsSync(f.path)) unlinkSync(f.path)
      } catch {
        /* ignore */
      }
    }
  }
}

function safePhotoExt(originalName) {
  const e = extname(originalName || '').toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.avif'].includes(e)) return e
  return '.jpg'
}

function mimeForPhotoFilename(name) {
  const e = extname(name || '').toLowerCase()
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.avif': 'image/avif',
  }
  return map[e] || 'application/octet-stream'
}

const PORT = Number(process.env.PORT || process.env.API_PORT || 8787)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

/** @returns {Map<string, number>} */
function loadAdminSessions() {
  if (!existsSync(ADMIN_SESSIONS_PATH)) return new Map()
  try {
    const raw = readFileSync(ADMIN_SESSIONS_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed?.sessions) ? parsed.sessions : []
    const now = Date.now()
    return new Map(
      rows
        .map((row) => [String(row?.token || ''), Number(row?.expiresAt || 0)])
        .filter(([token, expiresAt]) => token && Number.isFinite(expiresAt) && expiresAt > now),
    )
  } catch {
    return new Map()
  }
}

function saveAdminSessions() {
  mkdirSync(dirname(ADMIN_SESSIONS_PATH), { recursive: true })
  const sessions = [...adminSessions.entries()].map(([token, expiresAt]) => ({ token, expiresAt }))
  writeFileSync(ADMIN_SESSIONS_PATH, JSON.stringify({ sessions }, null, 2), 'utf8')
}

/** @type {Map<string, number>} token -> expiresAt epoch ms */
const adminSessions = loadAdminSessions()

function pruneSessions() {
  const now = Date.now()
  let changed = false
  for (const [t, exp] of adminSessions) {
    if (exp < now) {
      adminSessions.delete(t)
      changed = true
    }
  }
  if (changed) saveAdminSessions()
}

function getValidAdminToken(req) {
  pruneSessions()
  const auth = req.headers.authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  const headerToken = m?.[1] || ''
  const queryToken = String(req.query?.token || '').trim()
  const token = headerToken || queryToken
  if (!token) return null
  const exp = adminSessions.get(token)
  if (!exp || exp < Date.now()) return null
  return token
}

function requireAdmin(req, res, next) {
  const token = getValidAdminToken(req)
  if (!token) return res.status(401).json({ error: '세션이 만료되었거나 유효하지 않습니다.' })
  next()
}

const app = express()
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '512kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// ---- Global settings (persisted on server) ----
app.get('/api/site-header-nav', (_req, res) => {
  res.json({ config: getSiteHeaderNavConfig() })
})

app.put('/api/admin/site-header-nav', requireAdmin, (req, res) => {
  try {
    const next = req.body || {}
    const saved = setSiteHeaderNavConfig(next)
    res.json({ config: saved })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '저장에 실패했습니다.' })
  }
})

app.get('/api/landing-kpi', (_req, res) => {
  res.json({ kpi: getLandingKpi() })
})

app.put('/api/admin/landing-kpi', requireAdmin, (req, res) => {
  try {
    const b = req.body || {}
    const saved = setLandingKpi({
      cumulativeMembers: b.cumulativeMembers,
      cumulativeCouples: b.cumulativeCouples,
      inProgress: b.inProgress,
      successRate: b.successRate,
    })
    res.json({ kpi: saved })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '저장에 실패했습니다.' })
  }
})

app.get('/api/landing-member-stats', (_req, res) => {
  res.json({ stats: getLandingMemberStats() })
})

app.put('/api/admin/landing-member-stats', requireAdmin, (req, res) => {
  try {
    const b = req.body || {}
    const saved = setLandingMemberStats({
      maleMembers: b.maleMembers,
      femaleMembers: b.femaleMembers,
    })
    res.json({ stats: saved })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '저장에 실패했습니다.' })
  }
})

// Admin UI settings (menu visibility etc). Read is public so login page can use it.
app.get('/api/admin/ui-settings', (_req, res) => {
  res.json({ settings: getAdminUiSettings() })
})

app.put('/api/admin/ui-settings', requireAdmin, (req, res) => {
  try {
    const next = req.body || {}
    const saved = setAdminUiSettings(next)
    res.json({ settings: saved })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '저장에 실패했습니다.' })
  }
})

function memberInquiryPlaceholderEmail(userId) {
  const safe = String(userId)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 64)
  return `${safe || 'user'}@inquiry.member.local`
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function memberLocationFields(row) {
  const locationLat = optionalNumber(row?.locationLat)
  const locationLng = optionalNumber(row?.locationLng)
  const locationAccuracyM = optionalNumber(row?.locationAccuracyM)
  const locationUpdatedAt = String(row?.locationUpdatedAt || '').trim()
  const hasLocation = locationLat !== null && locationLng !== null
  return {
    locationLat,
    locationLng,
    locationAccuracyM,
    locationUpdatedAt: hasLocation ? locationUpdatedAt : '',
    hasLocation,
  }
}

function memberConsultationFields(row) {
  const allowed = ['none', 'requested', 'contacted', 'in_progress', 'completed']
  const raw = String(row?.consultationStatus || 'none').trim()
  const consultationStatus = allowed.includes(raw) ? raw : 'none'
  return {
    consultationStatus,
    consultationRequestedAt: String(row?.consultationRequestedAt || '').trim(),
  }
}

function memberAuthDto(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
  }
}

function memberSelfDto(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    phone: row.phone,
    birth: row.birth,
    gender: row.gender,
    height: row.height,
    weight: row.weight,
    job: row.job,
    region1: row.region1,
    region2: row.region2,
    education: row.education,
    mbti: row.mbti,
    smoke: row.smoke,
    drink: row.drink,
    car: row.car,
    appeal: row.appeal,
    obligationAgreed: row.obligationAgreed,
    createdAt: row.createdAt,
    lastLoginAt: String(row?.lastLoginAt || '').trim() || null,
    photoCount: Array.isArray(row.photos) ? row.photos.length : 0,
    ...memberLocationFields(row),
    ...memberConsultationFields(row),
  }
}

function memberAdminSummaryDto(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    phone: row.phone,
    birth: row.birth,
    gender: row.gender,
    height: row.height,
    weight: row.weight,
    job: row.job,
    region1: row.region1,
    region2: row.region2,
    education: row.education,
    mbti: row.mbti,
    smoke: row.smoke,
    drink: row.drink,
    car: row.car,
    appeal: row.appeal,
    obligationAgreed: row.obligationAgreed,
    createdAt: row.createdAt,
    lastLoginAt: String(row?.lastLoginAt || '').trim() || null,
    photoCount: Array.isArray(row.photos) ? row.photos.length : 0,
    hasLocation: memberLocationFields(row).hasLocation,
    locationUpdatedAt: memberLocationFields(row).locationUpdatedAt,
    ...memberConsultationFields(row),
  }
}

function memberAdminDetailDto(row) {
  if (!row) return null
  return {
    ...memberSelfDto(row),
    photos: Array.isArray(row.photos) ? row.photos : [],
    adminMemo: String(row?.adminMemo || ''),
  }
}

function parseLocationPatch(body, existing) {
  const trim = (v) => (v !== undefined && v !== null ? String(v).trim() : '')
  const rawLat = trim(body?.locationLat)
  const rawLng = trim(body?.locationLng)
  const rawAccuracy = trim(body?.locationAccuracyM)
  const rawUpdatedAt = trim(body?.locationUpdatedAt)
  const current = memberLocationFields(existing)
  const next = {
    locationLat: current.locationLat,
    locationLng: current.locationLng,
    locationAccuracyM: current.locationAccuracyM,
    locationUpdatedAt: current.locationUpdatedAt,
  }
  if (!rawLat && !rawLng && !rawAccuracy && !rawUpdatedAt) return next
  if (!rawLat || !rawLng) {
    throw new Error('위치 좌표가 올바르지 않습니다.')
  }
  const locationLat = optionalNumber(rawLat)
  const locationLng = optionalNumber(rawLng)
  const locationAccuracyM = rawAccuracy ? optionalNumber(rawAccuracy) : null
  if (locationLat === null || locationLng === null) {
    throw new Error('위치 좌표가 올바르지 않습니다.')
  }
  if (Math.abs(locationLat) > 90 || Math.abs(locationLng) > 180) {
    throw new Error('위치 좌표 범위가 올바르지 않습니다.')
  }
  if (locationAccuracyM !== null && locationAccuracyM < 0) {
    throw new Error('위치 정확도 값이 올바르지 않습니다.')
  }
  next.locationLat = Number(locationLat.toFixed(7))
  next.locationLng = Number(locationLng.toFixed(7))
  next.locationAccuracyM = locationAccuracyM !== null ? Number(locationAccuracyM.toFixed(1)) : null
  next.locationUpdatedAt = rawUpdatedAt || new Date().toISOString()
  return next
}

function memberAgeFromBirth(birth) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birth || '').trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1
  return age >= 0 ? age : null
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

app.post('/api/inquiries', (req, res) => {
  const b = req.body || {}
  const memberUserId = String(b.memberUserId || '').trim()
  const name = String(b.name || '').trim()
  let email = String(b.email || '').trim()
  const phone = String(b.phone || '').trim()
  const title = String(b.title || '').trim()
  const body = String(b.body || '').trim()
  if (!memberUserId && !name) return res.status(400).json({ error: '이름을 입력해 주세요.' })
  if (memberUserId) {
    email = memberInquiryPlaceholderEmail(memberUserId)
  } else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '올바른 이메일을 입력해 주세요.' })
  }
  if (!title) return res.status(400).json({ error: '제목을 입력해 주세요.' })
  if (title.length > 200) return res.status(400).json({ error: '제목은 200자 이내로 입력해 주세요.' })
  if (!body || body.length < 10) return res.status(400).json({ error: '문의 내용은 10자 이상 입력해 주세요.' })
  if (body.length > 20000) return res.status(400).json({ error: '문의 내용이 너무 깁니다.' })
  try {
    const inquiry = insertInquiry({
      memberUserId,
      name: memberUserId ? '' : name,
      email,
      phone: memberUserId ? '' : phone,
      title,
      body,
    })
    res.status(201).json({
      inquiry: {
        id: inquiry.id,
        createdAt: inquiry.createdAt,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '접수 중 오류가 발생했습니다.' })
  }
})

app.get('/api/inquiries', (req, res) => {
  const q = req.query.memberUserId
  const raw = typeof q === 'string' ? q : Array.isArray(q) ? String(q[0] ?? '') : ''
  const memberUserId = raw.trim()
  if (q !== undefined && !memberUserId) {
    return res.json({ inquiries: [] })
  }
  res.json({ inquiries: listInquiriesPublic(memberUserId || undefined) })
})

app.get('/api/inquiries/:id', (req, res) => {
  const row = getInquiryById(req.params.id)
  if (!row) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' })
  const memberOnRow = String(row.memberUserId || '').trim()
  if (memberOnRow) {
    const q = String(req.query.memberUserId || '').trim()
    if (q !== memberOnRow) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' })
  }
  const reply = String(row.reply || '').trim()
  res.json({
    inquiry: {
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      status: row.status,
      reply,
      replyAt: reply ? String(row.replyAt || '') || String(row.updatedAt || '') : '',
    },
  })
})

app.get('/api/recommendations', (_req, res) => {
  res.json({ items: listRecommendationsPublic() })
})

app.get('/api/notices', (_req, res) => {
  res.json({ notices: listNoticesPublic() })
})

app.get('/api/notices/:id', (req, res) => {
  const row = getNoticeById(req.params.id)
  if (!row || !row.published) {
    return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' })
  }
  res.json({
    notice: {
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  })
})

function reviewPublicDto(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    body: row.body,
    previewTone: row.previewTone,
    hasPhoto: Boolean(row.photoFile),
    pinned: row.pinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function reviewAdminDto(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    body: row.body,
    previewTone: row.previewTone,
    hasPhoto: Boolean(row.photoFile),
    pinned: row.pinned,
    published: row.published,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function reviewPhotoPath(row) {
  if (!row?.photoFile) return null
  const fname = row.photoFile
  if (fname.includes('/') || fname.includes('..')) return null
  const baseDir = resolve(join(__dirname, 'data', 'uploads', 'reviews', String(row.id)))
  const abs = resolve(join(baseDir, fname))
  const rel = relative(baseDir, abs)
  if (rel.startsWith('..') || rel === '' || rel.includes('..')) return null
  return abs
}

function saveReviewPhotoFile(reviewId, file, oldFile = '') {
  const dir = join(__dirname, 'data', 'uploads', 'reviews', String(reviewId))
  mkdirSync(dir, { recursive: true })
  const ext = safePhotoExt(file.originalname)
  const fname = `cover${ext}`
  const abs = join(dir, fname)
  if (oldFile && oldFile !== fname) {
    const oldAbs = join(dir, oldFile)
    if (existsSync(oldAbs)) unlinkSync(oldAbs)
  }
  if (existsSync(abs)) unlinkSync(abs)
  renameSync(file.path, abs)
  return fname
}

app.get('/api/reviews', (_req, res) => {
  res.json({ reviews: listReviewsPublic() })
})

app.get('/api/reviews/:id', (req, res) => {
  const row = getReviewById(req.params.id)
  if (!row || !row.published) {
    return res.status(404).json({ error: '커플 후기를 찾을 수 없습니다.' })
  }
  res.json({ review: reviewPublicDto(row) })
})

app.get('/api/reviews/:id/photo', (req, res) => {
  const row = getReviewById(req.params.id)
  if (!row || !row.published || !row.photoFile) return res.status(404).end()
  const abs = reviewPhotoPath(row)
  if (!abs) return res.status(400).json({ error: '잘못된 요청입니다.' })
  if (!existsSync(abs)) return res.status(404).end()
  res.setHeader('Content-Type', mimeForPhotoFilename(row.photoFile))
  res.sendFile(abs)
})

app.get('/api/members/check-userid', (req, res) => {
  const userId = String(req.query.userId || '').trim()
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' })
  const exists = Boolean(findByUserId(userId))
  res.json({ available: !exists })
})

app.post('/api/login', (req, res) => {
  const userId = String(req.body?.userId || '').trim()
  const password = String(req.body?.password || '')
  if (!userId) return res.status(400).json({ error: '아이디를 입력해 주세요.' })
  if (!password) return res.status(400).json({ error: '비밀번호를 입력해 주세요.' })
  const member = findByUserId(userId)
  if (!member || !verifyPassword(password, String(member.passwordHash || ''))) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
  }
  const loggedIn = recordMemberLogin(userId)
  res.json({
    member: memberAuthDto(loggedIn || member),
  })
})

app.get('/api/me', (req, res) => {
  const userId = String(req.query.userId || '').trim()
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' })
  const member = findByUserId(userId)
  if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
  res.json({ member: memberSelfDto(member) })
})

app.patch('/api/me', (req, res) => {
  const currentUserId = String(req.query.userId || '').trim()
  if (!currentUserId) return res.status(400).json({ error: 'userId가 필요합니다.' })
  const existing = findByUserId(currentUserId)
  if (!existing) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })

  const b = req.body || {}
  const trim = (v, fallback = '') => (v !== undefined && v !== null ? String(v).trim() : fallback)

  const userId = existing.userId
  const name = existing.name
  const phone = existing.phone
  const birth = existing.birth
  const gender = existing.gender
  const height = trim(b.height, existing.height)
  const weight = trim(b.weight, existing.weight)
  const job = trim(b.job, existing.job)
  const region1 = trim(b.region1, existing.region1)
  const region2 = trim(b.region2, existing.region2)
  const education = trim(b.education, existing.education)
  const mbti = trim(b.mbti, existing.mbti)
  const smoke = trim(b.smoke, existing.smoke)
  const drink = trim(b.drink, existing.drink)
  const car = trim(b.car, existing.car)
  const appeal = trim(b.appeal, existing.appeal)
  const obligationAgreed =
    typeof b.obligationAgreed === 'boolean' ? b.obligationAgreed : existing.obligationAgreed
  let locationPatch
  try {
    locationPatch = parseLocationPatch(b, existing)
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : '위치 정보를 저장하지 못했습니다.' })
  }

  if (!userId) return res.status(400).json({ error: '아이디를 입력해 주세요.' })
  if (!name) return res.status(400).json({ error: '이름을 입력해 주세요.' })
  if (!phone) return res.status(400).json({ error: '연락처를 입력해 주세요.' })
  if (!birth) return res.status(400).json({ error: '생년월일을 입력해 주세요.' })
  if (!gender) return res.status(400).json({ error: '성별을 선택해 주세요.' })
  if (!height || !weight || !job || !region1 || !region2) {
    return res.status(400).json({ error: '키·몸무게·직업·지역을 모두 입력해 주세요.' })
  }

  const patch = {
    name,
    phone,
    birth,
    gender,
    height,
    weight,
    job,
    region1,
    region2,
    education,
    mbti,
    smoke,
    drink,
    car,
    appeal,
    obligationAgreed,
    ...locationPatch,
  }

  const newPw = typeof b.newPassword === 'string' ? b.newPassword.trim() : ''
  const newPwConfirm = typeof b.newPasswordConfirm === 'string' ? b.newPasswordConfirm.trim() : ''
  if (newPw || newPwConfirm) {
    if (!newPw) {
      return res.status(400).json({ error: '새 비밀번호를 입력해 주세요.' })
    }
    if (!newPwConfirm) {
      return res.status(400).json({ error: '비밀번호 확인을 입력해 주세요.' })
    }
    if (newPw !== newPwConfirm) {
      return res.status(400).json({ error: '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.' })
    }
  }
  if (newPw) {
    if (newPw.length < 8) {
      return res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' })
    }
    patch.passwordHash = hashPassword(newPw)
  }

  const updated = updateMember(existing.id, patch)
  if (!updated) return res.status(500).json({ error: '저장에 실패했습니다.' })
  res.json({ member: memberSelfDto(updated) })
})

app.post('/api/me/consultation', (req, res) => {
  const userId = String(req.query.userId || req.body?.userId || '').trim()
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' })
  const existing = findByUserId(userId)
  if (!existing) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })

  const current = memberConsultationFields(existing)
  if (current.consultationStatus !== 'none' && current.consultationStatus !== 'completed') {
    return res.json({ member: memberSelfDto(existing), alreadyRequested: true })
  }

  const updated = updateMember(existing.id, {
    consultationStatus: 'requested',
    consultationRequestedAt: new Date().toISOString(),
  })
  if (!updated) return res.status(500).json({ error: '상담 신청에 실패했습니다.' })
  res.json({ member: memberSelfDto(updated), alreadyRequested: false })
})

app.post('/api/signup', signupUpload.fields(SIGNUP_PHOTO_FIELDS), (req, res) => {
  const files = req.files || {}
  const b = req.body || {}
  const phone = String(b.phone || '').trim()
  const name = String(b.name || '').trim()
  const birth = String(b.birth || '').trim()
  const userId = String(b.userId || '').trim()
  const password = String(b.password || '')
  const password2 = String(b.password2 || '')
  const gender = String(b.gender || '').trim()
  const height = String(b.height || '').trim()
  const weight = String(b.weight || '').trim()
  const job = String(b.job || '').trim()
  const region1 = String(b.region1 || '').trim()
  const region2 = String(b.region2 || '').trim()
  const education = String(b.education || '').trim()
  const mbti = String(b.mbti || '').trim()
  const smoke = String(b.smoke || '').trim()
  const drink = String(b.drink || '').trim()
  const car = String(b.car || '').trim()
  const appeal = String(b.appeal || '').trim()
  const obligationAgreed = String(b.obligation || '') === 'on'
  let locationPatch

  const fail = (status, msg) => {
    unlinkMulterFiles(files)
    return res.status(status).json({ error: msg })
  }

  if (!files.photo1?.[0] || !files.photo2?.[0]) {
    return fail(400, '사진 1·2는 필수입니다.')
  }
  if (!phone) {
    return fail(400, '휴대폰번호를 입력해 주세요.')
  }
  const missingCore = []
  if (!name) missingCore.push('이름')
  if (!birth) missingCore.push('생년월일')
  if (!userId) missingCore.push('아이디')
  if (!password) missingCore.push('비밀번호')
  if (missingCore.length) {
    return fail(400, `다음 항목이 비어 있습니다: ${missingCore.join(', ')}`)
  }
  if (password !== password2) {
    return fail(400, '비밀번호가 일치하지 않습니다.')
  }
  if (password.length < 8) {
    return fail(400, '비밀번호는 8자 이상이어야 합니다.')
  }
  if (!gender) return fail(400, '성별을 선택해 주세요.')
  if (!obligationAgreed) return fail(400, '회원의 의무 동의가 필요합니다.')
  if (!height || !weight || !job || !region1 || !region2) {
    const miss = []
    if (!height) miss.push('키')
    if (!weight) miss.push('몸무게')
    if (!job) miss.push('직업')
    if (!region1) miss.push('지역(시·도)')
    if (!region2) miss.push('지역(구)')
    return fail(400, `다음 프로필 항목을 입력·선택해 주세요: ${miss.join(', ')}`)
  }

  if (findByUserId(userId)) {
    return fail(409, '이미 사용 중인 아이디입니다.')
  }

  try {
    try {
      locationPatch = parseLocationPatch(b, null)
    } catch (e) {
      return fail(400, e instanceof Error ? e.message : '위치 정보를 저장하지 못했습니다.')
    }
    const member = insertMember({
      phone,
      name,
      birth,
      userId,
      passwordHash: hashPassword(password),
      gender,
      height,
      weight,
      job,
      region1,
      region2,
      education,
      mbti,
      smoke,
      drink,
      car,
      appeal,
      obligationAgreed,
      photos: [],
      ...locationPatch,
    })
    const dir = join(__dirname, 'data', 'uploads', String(member.id))
    mkdirSync(dir, { recursive: true })
    const photoNames = []
    const slots = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5']
    for (const slot of slots) {
      const f = files[slot]?.[0]
      if (!f) continue
      const ext = safePhotoExt(f.originalname)
      const fname = `${photoNames.length}${ext}`
      renameSync(f.path, join(dir, fname))
      photoNames.push(fname)
    }
    updateMember(member.id, { photos: photoNames })
    const fresh = getMemberById(member.id)
    res.status(201).json({ member: memberAuthDto(fresh) })
  } catch (e) {
    unlinkMulterFiles(files)
    console.error(e)
    res.status(500).json({ error: '저장 중 오류가 발생했습니다.' })
  }
})

app.post('/api/admin/login', (req, res, next) => {
  try {
    const password = String((req.body && req.body.password) || '')
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' })
    }
    const token = randomBytes(32).toString('hex')
    const ttlMs = 1000 * 60 * 60 * 12
    adminSessions.set(token, Date.now() + ttlMs)
    saveAdminSessions()
    res.json({ token, expiresInMs: ttlMs })
  } catch (e) {
    next(e)
  }
})

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const auth = req.headers.authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  if (m) {
    adminSessions.delete(m[1])
    saveAdminSessions()
  }
  res.json({ ok: true })
})

app.get('/api/admin/members/:id/photo/:idx', requireAdmin, (req, res) => {
  const idx = Number(req.params.idx)
  if (!Number.isInteger(idx) || idx < 0 || idx > 20) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  const member = getMemberById(req.params.id)
  if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
  const names = Array.isArray(member.photos) ? member.photos : []
  if (idx >= names.length) return res.status(404).json({ error: '파일이 없습니다.' })
  const fname = names[idx]
  if (!fname || fname.includes('/') || fname.includes('..')) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  const baseDir = resolve(join(__dirname, 'data', 'uploads', String(member.id)))
  const abs = resolve(join(baseDir, fname))
  const rel = relative(baseDir, abs)
  if (rel.startsWith('..') || rel === '' || rel.includes('..')) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  if (!existsSync(abs)) return res.status(404).json({ error: '파일이 없습니다.' })
  res.setHeader('Content-Type', mimeForPhotoFilename(fname))
  res.sendFile(abs)
})

app.delete('/api/admin/members/:id/photo/:idx', requireAdmin, (req, res) => {
  const idx = Number(req.params.idx)
  if (!Number.isInteger(idx) || idx < 0 || idx > 20) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  const member = getMemberById(req.params.id)
  if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
  const photos = Array.isArray(member.photos) ? member.photos.slice() : []
  if (idx >= photos.length) return res.status(404).json({ error: '파일이 없습니다.' })
  const fname = photos[idx]
  if (!fname || fname.includes('/') || fname.includes('..')) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  const baseDir = resolve(join(__dirname, 'data', 'uploads', String(member.id)))
  const abs = resolve(join(baseDir, fname))
  const rel = relative(baseDir, abs)
  if (rel.startsWith('..') || rel === '' || rel.includes('..')) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  try {
    if (existsSync(abs)) unlinkSync(abs)
  } catch {
    return res.status(500).json({ error: '사진 파일을 삭제하지 못했습니다.' })
  }
  photos.splice(idx, 1)
  const updated = updateMember(member.id, { photos })
  if (!updated) return res.status(500).json({ error: '회원 사진 목록을 갱신하지 못했습니다.' })
  res.json({ member: memberAdminDetailDto(updated) })
})

app.get('/api/admin/members/:id', requireAdmin, (req, res) => {
  const member = getMemberById(req.params.id)
  if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
  res.json({ member: memberAdminDetailDto(member) })
})

app.patch('/api/admin/members/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '잘못된 요청입니다.' })
  const existing = getMemberById(id)
  if (!existing) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })

  const b = req.body || {}
  const trim = (v, fallback = '') => (v !== undefined && v !== null ? String(v).trim() : fallback)

  const userId = trim(b.userId, existing.userId)
  const name = trim(b.name, existing.name)
  const phone = trim(b.phone, existing.phone)
  const birth = trim(b.birth, existing.birth)
  const gender = trim(b.gender, existing.gender)
  const height = trim(b.height, existing.height)
  const weight = trim(b.weight, existing.weight)
  const job = trim(b.job, existing.job)
  const region1 = trim(b.region1, existing.region1)
  const region2 = trim(b.region2, existing.region2)
  const education = trim(b.education, existing.education)
  const mbti = trim(b.mbti, existing.mbti)
  const smoke = trim(b.smoke, existing.smoke)
  const drink = trim(b.drink, existing.drink)
  const car = trim(b.car, existing.car)
  const appeal = trim(b.appeal, existing.appeal)
  const obligationAgreed =
    typeof b.obligationAgreed === 'boolean' ? b.obligationAgreed : existing.obligationAgreed
  let consultationPatch = {}
  if (b.consultationStatus !== undefined) {
    const allowed = ['none', 'requested', 'contacted', 'in_progress', 'completed']
    const nextStatus = String(b.consultationStatus || '').trim()
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ error: '상담 상태 값이 올바르지 않습니다.' })
    }
    consultationPatch = {
      consultationStatus: nextStatus,
      consultationRequestedAt:
        nextStatus === 'none'
          ? ''
          : String(existing.consultationRequestedAt || '').trim() || new Date().toISOString(),
    }
  }
  let locationPatch
  try {
    locationPatch = parseLocationPatch(b, existing)
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : '위치 정보를 저장하지 못했습니다.' })
  }

  if (!userId) return res.status(400).json({ error: '아이디를 입력해 주세요.' })
  if (!name) return res.status(400).json({ error: '이름을 입력해 주세요.' })
  if (!phone) return res.status(400).json({ error: '연락처를 입력해 주세요.' })
  if (!birth) return res.status(400).json({ error: '생년월일을 입력해 주세요.' })
  if (!gender) return res.status(400).json({ error: '성별을 선택해 주세요.' })
  if (!height || !weight || !job || !region1 || !region2) {
    return res.status(400).json({ error: '키·몸무게·직업·지역을 모두 입력해 주세요.' })
  }

  const other = findByUserId(userId)
  if (other && other.id !== id) {
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' })
  }

  const patch = {
    userId,
    name,
    phone,
    birth,
    gender,
    height,
    weight,
    job,
    region1,
    region2,
    education,
    mbti,
    smoke,
    drink,
    car,
    appeal,
    obligationAgreed,
    ...locationPatch,
    ...consultationPatch,
  }

  if (b.adminMemo !== undefined) {
    patch.adminMemo = String(b.adminMemo).slice(0, 10000)
  }

  const newPw = typeof b.newPassword === 'string' ? b.newPassword.trim() : ''
  if (newPw) {
    if (newPw.length < 8) {
      return res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' })
    }
    patch.passwordHash = hashPassword(newPw)
  }

  const updated = updateMember(id, patch)
  if (!updated) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
  res.json({ member: memberAdminDetailDto(updated) })
})

app.get('/api/admin/members', requireAdmin, (_req, res, next) => {
  try {
    res.json({ members: listMembers().map(memberAdminSummaryDto) })
  } catch (e) {
    next(e)
  }
})

app.get('/api/admin/nearby-members', requireAdmin, (req, res) => {
  const centerLat = optionalNumber(req.query.centerLat)
  const centerLng = optionalNumber(req.query.centerLng)
  const radiusKm = optionalNumber(req.query.radiusKm)
  if (centerLat === null || centerLng === null) {
    return res.status(400).json({ error: '중심 좌표가 필요합니다.' })
  }
  if (Math.abs(centerLat) > 90 || Math.abs(centerLng) > 180) {
    return res.status(400).json({ error: '중심 좌표 범위가 올바르지 않습니다.' })
  }
  const normalizedRadiusKm = radiusKm === null ? 5 : Math.min(50, Math.max(0.3, radiusKm))
  const allMembers = listMembers()
  const locationlessCount = allMembers.filter((row) => !memberLocationFields(row).hasLocation).length
  const members = allMembers
    .map((row) => {
      const location = memberLocationFields(row)
      if (!location.hasLocation || location.locationLat === null || location.locationLng === null) return null
      const distanceKm = haversineKm(centerLat, centerLng, location.locationLat, location.locationLng)
      if (distanceKm > normalizedRadiusKm) return null
      return {
        id: row.id,
        name: row.name,
        gender: row.gender,
        age: memberAgeFromBirth(row.birth),
        height: row.height,
        job: row.job,
        region1: row.region1,
        region2: row.region2,
        photoCount: Array.isArray(row.photos) ? row.photos.length : 0,
        locationLat: location.locationLat,
        locationLng: location.locationLng,
        locationAccuracyM: location.locationAccuracyM,
        locationUpdatedAt: location.locationUpdatedAt,
        distanceKm: Number(distanceKm.toFixed(2)),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  res.json({
    center: {
      lat: Number(centerLat.toFixed(7)),
      lng: Number(centerLng.toFixed(7)),
      radiusKm: Number(normalizedRadiusKm.toFixed(1)),
    },
    totalMemberCount: allMembers.length,
    locationlessCount,
    members,
  })
})

app.get('/api/admin/inquiries', requireAdmin, (_req, res) => {
  const rows = listInquiriesAdmin()
  res.json({
    inquiries: rows.map((r) => ({
      id: r.id,
      memberUserId: String(r.memberUserId || ''),
      name: r.name,
      email: r.email,
      phone: r.phone,
      title: r.title,
      status: r.status,
      hasReply: Boolean(String(r.reply || '').trim()),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  })
})

app.get('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const row = getInquiryById(req.params.id)
  if (!row) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' })
  res.json({
    inquiry: {
      id: row.id,
      memberUserId: String(row.memberUserId || ''),
      name: row.name,
      email: row.email,
      phone: row.phone,
      title: row.title,
      body: row.body,
      status: row.status,
      adminMemo: row.adminMemo,
      reply: String(row.reply || ''),
      replyAt: String(row.replyAt || ''),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  })
})

app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const row = getInquiryById(req.params.id)
  if (!row) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' })
  const b = req.body || {}
  const patch = {}
  if (b.status !== undefined) {
    const s = String(b.status)
    if (!['new', 'in_progress', 'closed'].includes(s)) {
      return res.status(400).json({ error: '상태 값이 올바르지 않습니다.' })
    }
    patch.status = s
  }
  if (b.adminMemo !== undefined) {
    patch.adminMemo = String(b.adminMemo).slice(0, 10000)
  }
  if (b.reply !== undefined) {
    const reply = String(b.reply).slice(0, 20000)
    patch.reply = reply
    patch.replyAt = reply.trim() ? new Date().toISOString() : ''
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: '변경할 내용이 없습니다.' })
  }
  const updated = updateInquiryRow(row.id, patch)
  if (!updated) return res.status(500).json({ error: '저장에 실패했습니다.' })
  res.json({
    inquiry: {
      id: updated.id,
      memberUserId: String(updated.memberUserId || ''),
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      title: updated.title,
      body: updated.body,
      status: updated.status,
      adminMemo: updated.adminMemo,
      reply: String(updated.reply || ''),
      replyAt: String(updated.replyAt || ''),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
})

app.get('/api/admin/recommendations', requireAdmin, (_req, res) => {
  res.json({ items: listRecommendationsPublic() })
})

app.post('/api/admin/recommendations', requireAdmin, (req, res) => {
  const quote = String(req.body?.quote || '').trim()
  const tone = String(req.body?.tone || 'gray').trim()
  if (!quote) return res.status(400).json({ error: '문구를 입력해 주세요.' })
  if (quote.length > 800) {
    return res.status(400).json({ error: '문구는 800자 이내로 입력해 주세요.' })
  }
  try {
    const item = insertRecommendation({ quote, tone })
    res.status(201).json({ item })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '저장에 실패했습니다.' })
  }
})

app.put('/api/admin/recommendations/order', requireAdmin, (req, res) => {
  const raw = req.body?.ids
  if (!Array.isArray(raw)) {
    return res.status(400).json({ error: 'ids 배열이 필요합니다.' })
  }
  const ok = reorderRecommendations(raw)
  if (!ok) {
    return res.status(400).json({ error: '현재 목록과 맞지 않는 순서입니다.' })
  }
  res.json({ items: listRecommendationsPublic() })
})

app.delete('/api/admin/recommendations/:id', requireAdmin, (req, res) => {
  const ok = deleteRecommendationById(req.params.id)
  if (!ok) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' })
  res.json({ ok: true })
})

app.get('/api/admin/notices', requireAdmin, (_req, res) => {
  res.json({ notices: listNoticesAdmin() })
})

app.post('/api/admin/notices', requireAdmin, (req, res) => {
  const title = String(req.body?.title || '').trim()
  const body = String(req.body?.body || '').trim()
  const pinned = Boolean(req.body?.pinned)
  const published = req.body?.published !== false
  if (!title) return res.status(400).json({ error: '제목을 입력해 주세요.' })
  if (!body) return res.status(400).json({ error: '내용을 입력해 주세요.' })
  if (title.length > 200) return res.status(400).json({ error: '제목은 200자 이내로 입력해 주세요.' })
  if (body.length > 50000) return res.status(400).json({ error: '내용이 너무 깁니다.' })
  try {
    const notice = insertNotice({ title, body, pinned, published })
    res.status(201).json({ notice })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '저장에 실패했습니다.' })
  }
})

app.get('/api/admin/notices/:id', requireAdmin, (req, res) => {
  const row = getNoticeById(req.params.id)
  if (!row) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' })
  res.json({
    notice: {
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      published: row.published,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  })
})

app.patch('/api/admin/notices/:id', requireAdmin, (req, res) => {
  const existing = getNoticeById(req.params.id)
  if (!existing) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' })
  const b = req.body || {}
  const patch = {}
  if (b.title !== undefined) {
    const title = String(b.title || '').trim()
    if (!title) return res.status(400).json({ error: '제목을 입력해 주세요.' })
    if (title.length > 200) return res.status(400).json({ error: '제목은 200자 이내로 입력해 주세요.' })
    patch.title = title
  }
  if (b.body !== undefined) {
    const body = String(b.body || '').trim()
    if (!body) return res.status(400).json({ error: '내용을 입력해 주세요.' })
    if (body.length > 50000) return res.status(400).json({ error: '내용이 너무 깁니다.' })
    patch.body = body
  }
  if (b.pinned !== undefined) patch.pinned = Boolean(b.pinned)
  if (b.published !== undefined) patch.published = Boolean(b.published)
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: '변경할 내용이 없습니다.' })
  }
  const updated = updateNoticeRow(existing.id, patch)
  if (!updated) return res.status(500).json({ error: '저장에 실패했습니다.' })
  res.json({ notice: updated })
})

app.delete('/api/admin/notices/:id', requireAdmin, (req, res) => {
  const ok = deleteNoticeById(req.params.id)
  if (!ok) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' })
  res.json({ ok: true })
})

app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  res.json({ reviews: listReviewsAdmin() })
})

app.get('/api/admin/reviews/:id/photo', requireAdmin, (req, res) => {
  const row = getReviewById(req.params.id)
  if (!row || !row.photoFile) return res.status(404).end()
  const abs = reviewPhotoPath(row)
  if (!abs) return res.status(400).json({ error: '잘못된 요청입니다.' })
  if (!existsSync(abs)) return res.status(404).end()
  res.setHeader('Content-Type', mimeForPhotoFilename(row.photoFile))
  res.sendFile(abs)
})

app.post('/api/admin/reviews', requireAdmin, reviewPhotoUpload.single('photo'), (req, res) => {
  const file = req.file
  const b = req.body || {}
  const title = String(b.title || '').trim()
  const subtitle = String(b.subtitle || '').trim()
  const summary = String(b.summary || '').trim()
  const body = String(b.body || '').trim()
  const pinned = String(b.pinned || '').trim() === 'true'
  const published = String(b.published || 'true').trim() !== 'false'

  const fail = (status, msg) => {
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(status).json({ error: msg })
  }

  if (!title) return fail(400, '제목을 입력해 주세요.')
  if (!summary) return fail(400, '요약을 입력해 주세요.')
  if (!body) return fail(400, '본문을 입력해 주세요.')
  if (title.length > 200) return fail(400, '제목은 200자 이내로 입력해 주세요.')
  if (subtitle.length > 200) return fail(400, '부제목은 200자 이내로 입력해 주세요.')
  if (summary.length > 500) return fail(400, '요약은 500자 이내로 입력해 주세요.')
  if (body.length > 50000) return fail(400, '본문이 너무 깁니다.')
  if (!file) return fail(400, '상단 이미지를 선택해 주세요.')

  try {
    const review = insertReview({ title, subtitle, summary, body, pinned, published, photoFile: '' })
    const photoFile = saveReviewPhotoFile(review.id, file)
    const updated = updateReviewRow(review.id, { photoFile })
    if (!updated) return fail(500, '저장 후 이미지를 반영하지 못했습니다.')
    res.status(201).json({ review: reviewAdminDto(updated) })
  } catch (e) {
    console.error(e)
    return fail(500, '저장에 실패했습니다.')
  }
})

app.get('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const row = getReviewById(req.params.id)
  if (!row) return res.status(404).json({ error: '커플 후기를 찾을 수 없습니다.' })
  res.json({ review: reviewAdminDto(row) })
})

app.patch('/api/admin/reviews/:id', requireAdmin, reviewPhotoUpload.single('photo'), (req, res) => {
  const file = req.file
  const existing = getReviewById(req.params.id)
  if (!existing) {
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(404).json({ error: '커플 후기를 찾을 수 없습니다.' })
  }
  const b = req.body || {}
  const patch = {}

  const fail = (status, msg) => {
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(status).json({ error: msg })
  }

  if (b.title !== undefined) {
    const title = String(b.title || '').trim()
    if (!title) return fail(400, '제목을 입력해 주세요.')
    if (title.length > 200) return fail(400, '제목은 200자 이내로 입력해 주세요.')
    patch.title = title
  }
  if (b.subtitle !== undefined) {
    const subtitle = String(b.subtitle || '').trim()
    if (subtitle.length > 200) return fail(400, '부제목은 200자 이내로 입력해 주세요.')
    patch.subtitle = subtitle
  }
  if (b.summary !== undefined) {
    const summary = String(b.summary || '').trim()
    if (!summary) return fail(400, '요약을 입력해 주세요.')
    if (summary.length > 500) return fail(400, '요약은 500자 이내로 입력해 주세요.')
    patch.summary = summary
  }
  if (b.body !== undefined) {
    const body = String(b.body || '').trim()
    if (!body) return fail(400, '본문을 입력해 주세요.')
    if (body.length > 50000) return fail(400, '본문이 너무 깁니다.')
    patch.body = body
  }
  if (b.pinned !== undefined) patch.pinned = String(b.pinned || '').trim() === 'true'
  if (b.published !== undefined) patch.published = String(b.published || '').trim() === 'true'
  if (file) patch.photoFile = saveReviewPhotoFile(existing.id, file, existing.photoFile)
  if (Object.keys(patch).length === 0) {
    return fail(400, '변경할 내용이 없습니다.')
  }
  const updated = updateReviewRow(existing.id, patch)
  if (!updated) return fail(500, '저장에 실패했습니다.')
  res.json({ review: reviewAdminDto(updated) })
})

app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const existing = getReviewById(req.params.id)
  const ok = deleteReviewById(req.params.id)
  if (!ok) return res.status(404).json({ error: '커플 후기를 찾을 수 없습니다.' })
  try {
    const abs = existing ? reviewPhotoPath(existing) : null
    if (abs && existsSync(abs)) unlinkSync(abs)
  } catch {
    /* ignore */
  }
  res.json({ ok: true })
})

app.get('/api/admin/managers', requireAdmin, (_req, res) => {
  res.json({ managers: listManagersAdmin() })
})

app.get('/api/admin/managers/:id', requireAdmin, (req, res) => {
  const m = getManagerById(req.params.id)
  if (!m) return res.status(404).json({ error: '매니저를 찾을 수 없습니다.' })
  res.json({ manager: managerAdminDto(m) })
})

app.patch('/api/admin/managers/:id', requireAdmin, managerPhotoUpload.single('photo'), (req, res) => {
  const file = req.file
  const m = getManagerById(req.params.id)
  if (!m) {
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(404).json({ error: '매니저를 찾을 수 없습니다.' })
  }

  const fail = (status, msg) => {
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(status).json({ error: msg })
  }

  const b = req.body || {}
  const name = String(b.name ?? m.name).trim()
  if (!name) return fail(400, '매니저 이름을 입력해 주세요.')
  const intro = String(b.intro ?? m.intro ?? '').trim().slice(0, 200)
  const tags = String(b.tags ?? m.tags ?? '')
    .trim()
    .slice(0, 120)
  const consultMethod = String(b.consultMethod ?? m.consultMethod ?? '').trim().slice(0, 100)
  const successCount = Math.max(0, Math.floor(Number(b.successCount ?? m.successCount) || 0))

  const patch = { name, intro, tags, consultMethod, successCount }

  try {
    if (file) {
      const dir = join(__dirname, 'data', 'uploads', 'managers', String(m.id))
      mkdirSync(dir, { recursive: true })
      const ext = safePhotoExt(file.originalname)
      const fname = `avatar${ext}`
      const abs = join(dir, fname)
      if (m.photoFile && m.photoFile !== fname) {
        const oldAbs = join(dir, m.photoFile)
        if (existsSync(oldAbs)) unlinkSync(oldAbs)
      }
      if (existsSync(abs)) unlinkSync(abs)
      renameSync(file.path, abs)
      patch.photoFile = fname
    }

    const updated = updateManagerRow(m.id, patch)
    if (!updated) return fail(500, '저장에 실패했습니다.')
    res.json({ manager: managerAdminDto(updated) })
  } catch (e) {
    console.error(e)
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(500).json({ error: '저장 중 오류가 발생했습니다.' })
  }
})

app.get('/api/managers', (_req, res) => {
  res.json({ managers: listManagersPublic() })
})

app.get('/api/managers/:id/photo', (req, res) => {
  const m = getManagerById(req.params.id)
  if (!m || !m.photoFile) return res.status(404).end()
  const fname = m.photoFile
  if (fname.includes('/') || fname.includes('..')) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  const baseDir = resolve(join(__dirname, 'data', 'uploads', 'managers', String(m.id)))
  const abs = resolve(join(baseDir, fname))
  const rel = relative(baseDir, abs)
  if (rel.startsWith('..') || rel === '' || rel.includes('..')) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  if (!existsSync(abs)) return res.status(404).end()
  res.setHeader('Content-Type', mimeForPhotoFilename(fname))
  res.sendFile(abs)
})

app.post('/api/admin/managers', requireAdmin, managerPhotoUpload.single('photo'), (req, res) => {
  const file = req.file
  const b = req.body || {}
  const name = String(b.name || '').trim()
  const successCount = Math.max(0, Math.floor(Number(b.successCount) || 0))
  const intro = String(b.intro || '').trim().slice(0, 200)
  const tags = String(b.tags || '')
    .trim()
    .slice(0, 120)
  const consultMethod = String(b.consultMethod || '').trim().slice(0, 100)

  const fail = (status, msg) => {
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(status).json({ error: msg })
  }

  if (!name) return fail(400, '매니저 이름을 입력해 주세요.')
  if (!file) return fail(400, '프로필 사진을 선택해 주세요.')

  try {
    const row = insertManager({
      name,
      intro,
      tags,
      consultMethod,
      successCount,
      photoFile: '',
    })
    const dir = join(__dirname, 'data', 'uploads', 'managers', String(row.id))
    mkdirSync(dir, { recursive: true })
    const ext = safePhotoExt(file.originalname)
    const fname = `avatar${ext}`
    const abs = join(dir, fname)
    renameSync(file.path, abs)
    const updated = updateManagerRow(row.id, { photoFile: fname })
    if (!updated) return fail(500, '저장 후 갱신에 실패했습니다.')
    res.status(201).json({
      manager: managerAdminDto(updated),
    })
  } catch (e) {
    console.error(e)
    try {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path)
    } catch {
      /* ignore */
    }
    return res.status(500).json({ error: '저장 중 오류가 발생했습니다.' })
  }
})

/** @type {import('express').ErrorRequestHandler} */
function jsonErrorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err)
    return
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: '요청 본문(JSON) 형식이 올바르지 않습니다.' })
  }
  const status =
    typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500
  console.error('[api]', err)
  const message = err instanceof Error ? err.message : String(err)
  res.status(status).json({
    error: message || '서버 오류가 발생했습니다.',
    code: status >= 500 ? 'INTERNAL' : 'ERROR',
  })
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: '요청한 API를 찾을 수 없습니다.', path: req.originalUrl || req.url })
})

const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    res.sendFile(join(distDir, 'index.html'), (err) => (err ? next(err) : undefined))
  })
  console.log(`[api] serving frontend from ${distDir}`)
}

app.use(jsonErrorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] http://0.0.0.0:${PORT}`)
  console.log(`[api] ADMIN_PASSWORD=${ADMIN_PASSWORD === 'admin123' ? 'admin123 (기본값)' : '(환경변수 설정됨)'}`)
})
