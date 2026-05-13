import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto'

const ITERATIONS = 120_000
const KEYLEN = 64
const DIGEST = 'sha512'

/** @param {string} password */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  return `${salt}:${hash}`
}

/**
 * @param {string} password
 * @param {string} stored "salt:hash"
 */
export function verifyPassword(password, stored) {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [salt, hash] = parts
  const hash2 = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hash2, 'hex'))
  } catch {
    return false
  }
}
