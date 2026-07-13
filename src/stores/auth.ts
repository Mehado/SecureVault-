import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { deriveAuthToken, deriveAndExportKey, generateSalt, base64Encode, base64Decode } from '@/crypto/index'

export const useAuthStore = defineStore('auth', () => {
  const isUnlocked = ref(false)
  const filePath = ref('')
  const masterKeyBase64 = ref('')
  const salt = ref('')
  const authHash = ref('')
  const version = ref(1)

  const hasMasterKey = computed(() => !!masterKeyBase64.value)

  async function createVault(password: string, savePath: string) {
    const saltBytes = generateSalt()
    const saltB64 = base64Encode(saltBytes)
    const hash = await deriveAuthToken(password)
    const { key, keyBase64 } = await deriveAndExportKey(password, saltBytes)

    masterKeyBase64.value = keyBase64
    salt.value = saltB64
    authHash.value = hash
    filePath.value = savePath
    version.value = 0   // 0 = 已创建但尚未写入文件（首次 saveToFile 写入 version 1）
    isUnlocked.value = true
  }

  async function unlockVault(password: string, path: string) {
    const result = await window.electronAPI.readFile(path)
    if (!result.success) throw new Error('无法读取保险库文件: ' + (result.error || '未知错误'))

    const vaultFile = JSON.parse(result.data!)
    if (!vaultFile.authHash || !vaultFile.salt) throw new Error('无效的保险库文件')

    const hash = await deriveAuthToken(password)
    if (hash !== vaultFile.authHash) throw new Error('密码错误')

    const saltBytes = base64Decode(vaultFile.salt)
    const { key, keyBase64 } = await deriveAndExportKey(password, saltBytes)

    masterKeyBase64.value = keyBase64
    salt.value = vaultFile.salt
    authHash.value = vaultFile.authHash
    filePath.value = path
    version.value = vaultFile.version || 1
    isUnlocked.value = true
  }

  /**
   * ⚠️ 安全说明
   * masterKeyBase64 为 Pinia 响应式字符串。锁定时清空引用，
   * 但 JavaScript 无法强制 GC 或覆写原始 ArrayBuffer 内存。
   * 这是 Electron + Web Crypto 架构的固有限制。
   * 如需更强保证，应使用原生 node:crypto 或硬件安全模块。
   */
  function lock() {
    isUnlocked.value = false
    masterKeyBase64.value = ''
    salt.value = ''
    authHash.value = ''
    filePath.value = ''
    version.value = 1
  }

  return { isUnlocked, filePath, masterKeyBase64, salt, authHash, version, hasMasterKey, createVault, unlockVault, lock }
})
