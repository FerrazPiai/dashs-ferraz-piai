// server/lib/crypto.js
// AES-256-GCM para refresh tokens Google (D-01). Chave em TOKEN_ENC_KEY (32 bytes base64).
// Formato do cipher: base64(iv || tag || ciphertext) — iv=12B, tag=16B.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const IV_LEN = 12
const TAG_LEN = 16

function getKey() {
  const raw = process.env.TOKEN_ENC_KEY
  if (!raw) throw new Error('TOKEN_ENC_KEY nao configurado')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`TOKEN_ENC_KEY deve ter 32 bytes em base64, recebido ${key.length}`)
  }
  return key
}

export function encrypt(plaintext) {
  if (plaintext == null) throw new Error('encrypt: plaintext obrigatorio')
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decrypt(cipherB64) {
  if (!cipherB64) throw new Error('decrypt: cipherB64 obrigatorio')
  const key = getKey()
  const buf = Buffer.from(cipherB64, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error('cipher invalido (tamanho curto)')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function generateKey() {
  // Helper para operadores gerarem TOKEN_ENC_KEY: `node -e "import('./server/lib/crypto.js').then(m=>console.log(m.generateKey()))"`
  return randomBytes(32).toString('base64')
}
