import { createHash, randomBytes } from 'node:crypto'

/** Id ngắn, khó đoán: `m_Xy3…` */
export function newId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString('base64url')}`
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}
