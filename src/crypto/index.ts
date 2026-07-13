const GCM_IV_LENGTH = 12
const GCM_TAG_LENGTH = 128

const PBKDF2_ITERATIONS = 600_000
const PBKDF2_SALT_LENGTH = 16
const PBKDF2_HASH = 'SHA-256'
const PBKDF2_KEY_LENGTH = 256

/**
 * 认证哈希的固定 salt。
 * 注意：这会导致相同密码产生相同 auth hash，从而侧面泄露两个 vault 使用了相同密码。
 * 但这避免了"先解密再验证"的额外开销，且实际利用场景极少。
 * 未来版本可考虑升级为 per-vault auth salt。
 */
const AUTH_FIXED_SALT = new TextEncoder().encode('SecureVault-AuthSalt-v1')

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64Encode(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
}

export function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function deriveAndExportKey(
  password: string,
  salt: Uint8Array
): Promise<{ key: CryptoKey; keyBase64: string }> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    keyMaterial,
    { name: 'AES-GCM', length: PBKDF2_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )

  const raw = await crypto.subtle.exportKey('raw', aesKey)
  return { key: aesKey, keyBase64: bytesToBase64(new Uint8Array(raw)) }
}

export async function importKeyFromBase64(keyBase64: string): Promise<CryptoKey> {
  const bytes = base64Decode(keyBase64)
  return await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH))
}

export async function deriveAuthToken(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: AUTH_FIXED_SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    keyMaterial,
    256
  )
  const hashed = await crypto.subtle.digest('SHA-256', bits)
  return base64Encode(new Uint8Array(hashed))
}

export async function encrypt(
  plaintext: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: string; nonce: string; tag: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: GCM_TAG_LENGTH },
    key,
    plaintext
  )

  const encryptedArr = new Uint8Array(encrypted)
  const tagStart = encryptedArr.length - 16
  const cipherBytes = encryptedArr.slice(0, tagStart)
  const tagBytes = encryptedArr.slice(tagStart)

  return {
    ciphertext: base64Encode(cipherBytes),
    nonce: base64Encode(nonce),
    tag: base64Encode(tagBytes)
  }
}

export async function decrypt(
  ciphertextB64: string,
  nonceB64: string,
  tagB64: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const ciphertext = base64Decode(ciphertextB64)
  const nonce = base64Decode(nonceB64)
  const tag = base64Decode(tagB64)

  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext, 0)
  combined.set(tag, ciphertext.length)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: GCM_TAG_LENGTH },
    key,
    combined
  )

  return new Uint8Array(decrypted)
}

// ──────────────────────────────────────────────────────────
// 密码强度评估（基于 heuristics，无需外部库）
// ──────────────────────────────────────────────────────────

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4  // 0=极弱 1=弱 2=一般 3=强 4=很强
  label: string
  color: string
  percent: number
}

export function evaluatePasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: '', color: '#6b7280', percent: 0 }

  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 14) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++

  // 归一化到 0-4
  const clamped = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4
  const levels: [string, string, number][] = [
    ['极弱', '#dc2626', 20],
    ['弱',   '#f59e0b', 40],
    ['一般', '#14b8a6', 60],
    ['强',   '#10b981', 80],
    ['很强', '#059669', 100],
  ]
  const [label, color, percent] = levels[clamped]
  return { score: clamped, label, color, percent }
}

/**
 * 生成安全密码，保证每类被选中的字符至少出现一次。
 */
export function generateSecurePassword(
  length: number,
  useUpper: boolean,
  useLower: boolean,
  useDigits: boolean,
  useSymbols: boolean,
): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?'

  let charset = ''
  if (useUpper) charset += upper
  if (useLower) charset += lower
  if (useDigits) charset += digits
  if (useSymbols) charset += symbols
  if (!charset) return ''

  const randomBytes = new Uint8Array(length * 2)
  crypto.getRandomValues(randomBytes)

  // 先保证每类至少一个字符
  const result: string[] = []
  let idx = 0
  if (useUpper) result.push(upper[randomBytes[idx++]! % upper.length])
  if (useLower) result.push(lower[randomBytes[idx++]! % lower.length])
  if (useDigits) result.push(digits[randomBytes[idx++]! % digits.length])
  if (useSymbols) result.push(symbols[randomBytes[idx++]! % symbols.length])

  // 填充剩余位置
  while (result.length < length) {
    result.push(charset[randomBytes[idx++]! % charset.length])
  }

  // Fisher-Yates 洗牌
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomBytes[idx++]! % (i + 1)
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }

  return result.join('')
}
