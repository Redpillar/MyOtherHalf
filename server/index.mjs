import express from 'express'
import cors from 'cors'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { hashPassword } from './cryptoUtil.mjs'
import {
  findByUserId,
  getMemberPublicById,
  insertMember,
  listMembersPublic,
  updateMember,
} from './membersStore.mjs'
import {
  getManagerById,
  insertManager,
  listManagersAdmin,
  listManagersPublic,
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
const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP_UPLOAD_DIR = join(__dirname, 'data', 'tmp_upload')
mkdirSync(TMP_UPLOAD_DIR, { recursive: true })

const signupUpload = multer({
  dest: TMP_UPLOAD_DIR,
  limits: { fileSize: 12 * 1024 * 1024, files: 5 },
})

const managerPhotoUpload = multer({
  dest: TMP_UPLOAD_DIR,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
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

const PORT = Number(process.env.API_PORT || 8787)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

/** @type {Map<string, number>} token -> expiresAt epoch ms */
const adminSessions = new Map()

function pruneSessions() {
  const now = Date.now()
  for (const [t, exp] of adminSessions) {
    if (exp < now) adminSessions.delete(t)
  }
}

function requireAdmin(req, res, next) {
  pruneSessions()
  const auth = req.headers.authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  if (!m) return res.status(401).json({ error: '인증이 필요합니다.' })
  const token = m[1]
  const exp = adminSessions.get(token)
  if (!exp || exp < Date.now()) return res.status(401).json({ error: '세션이 만료되었거나 유효하지 않습니다.' })
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

function memberInquiryPlaceholderEmail(userId) {
  const safe = String(userId)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 64)
  return `${safe || 'user'}@inquiry.member.local`
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

app.get('/api/members/check-userid', (req, res) => {
  const userId = String(req.query.userId || '').trim()
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' })
  const exists = Boolean(findByUserId(userId))
  res.json({ available: !exists })
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
    const fresh = getMemberPublicById(member.id)
    res.status(201).json({ member: fresh })
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
    res.json({ token, expiresInMs: ttlMs })
  } catch (e) {
    next(e)
  }
})

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const auth = req.headers.authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  if (m) adminSessions.delete(m[1])
  res.json({ ok: true })
})

app.get('/api/admin/members/:id/photo/:idx', requireAdmin, (req, res) => {
  const idx = Number(req.params.idx)
  if (!Number.isInteger(idx) || idx < 0 || idx > 20) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }
  const member = getMemberPublicById(req.params.id)
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

app.get('/api/admin/members/:id', requireAdmin, (req, res) => {
  const member = getMemberPublicById(req.params.id)
  if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
  res.json({ member })
})

app.patch('/api/admin/members/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '잘못된 요청입니다.' })
  const existing = getMemberPublicById(id)
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
  const { passwordHash: _p, ...member } = updated
  res.json({ member })
})

app.get('/api/admin/members', requireAdmin, (_req, res, next) => {
  try {
    res.json({ members: listMembersPublic() })
  } catch (e) {
    next(e)
  }
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

function managerAdminDto(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    ratingStars: row.ratingStars,
    successCount: row.successCount,
    reviewCount: row.reviewCount,
    hasPhoto: Boolean(row.photoFile),
    createdAt: row.createdAt || '',
  }
}

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
  const ratingStars = Math.min(5, Math.max(1, Math.floor(Number(b.ratingStars ?? m.ratingStars) || 5)))
  const successCount = Math.max(0, Math.floor(Number(b.successCount ?? m.successCount) || 0))
  const reviewCount = Math.max(0, Math.floor(Number(b.reviewCount ?? m.reviewCount) || 0))

  const patch = { name, ratingStars, successCount, reviewCount }

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
  const ratingStars = Math.min(5, Math.max(1, Math.floor(Number(b.ratingStars) || 5)))
  const successCount = Math.max(0, Math.floor(Number(b.successCount) || 0))
  const reviewCount = Math.max(0, Math.floor(Number(b.reviewCount) || 0))

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
      ratingStars,
      successCount,
      reviewCount,
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
      manager: {
        id: updated.id,
        name: updated.name,
        ratingStars: updated.ratingStars,
        successCount: updated.successCount,
        reviewCount: updated.reviewCount,
        hasPhoto: Boolean(updated.photoFile),
      },
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

app.use(jsonErrorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] http://127.0.0.1:${PORT}`)
  console.log(`[api] ADMIN_PASSWORD=${ADMIN_PASSWORD === 'admin123' ? 'admin123 (기본값)' : '(환경변수 설정됨)'}`)
})
