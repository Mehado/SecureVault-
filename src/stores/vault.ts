import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { importKeyFromBase64, encrypt, decrypt, deriveAuthToken, base64Decode, deriveAndExportKey } from '@/crypto/index'

export interface VaultEntry {
  id: string
  website: string
  username: string
  password: string
  notes?: string
  tags?: string
  favorite: boolean
  createdAt?: string
  updatedAt?: string
}

export interface VaultData {
  version: number
  entries: VaultEntry[]
}

export const useVaultStore = defineStore('vault', () => {
  const entries = ref<VaultEntry[]>([])
  const version = ref(1)
  const isDirty = ref(false)

  function loadVault(data: VaultData) {
    entries.value = (data.entries || []).map(e => ({
      ...e,
      id: e.id || crypto.randomUUID()
    }))
    version.value = data.version || 1
    isDirty.value = false
  }

  function addEntry(entry: VaultEntry) {
    entries.value.push(entry)
    isDirty.value = true
  }

  function removeEntry(index: number) {
    if (index >= 0 && index < entries.value.length) {
      entries.value.splice(index, 1)
      isDirty.value = true
    }
  }

  function updateEntry(index: number, entry: VaultEntry) {
    if (index >= 0 && index < entries.value.length) {
      entries.value[index] = entry
      isDirty.value = true
    }
  }

  function clear() {
    entries.value = []
    version.value = 1
    isDirty.value = false
  }

  async function saveToFile(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isUnlocked) throw new Error('保险库未解锁')
    if (!isDirty.value) return // 无变更，跳过写入

    const nextVersion = auth.version + 1
    const key = await importKeyFromBase64(auth.masterKeyBase64)
    const json = JSON.stringify({ version: nextVersion, entries: entries.value })
    const encrypted = await encrypt(new TextEncoder().encode(json), key)

    const vaultFile = {
      salt: auth.salt,
      authHash: auth.authHash,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      tag: encrypted.tag,
      version: nextVersion,
    }

    const result = await window.electronAPI.writeFile(auth.filePath, JSON.stringify(vaultFile, null, 2))
    if (!result.success) throw new Error('保存失败: ' + (result.error || '未知错误'))
    auth.version = nextVersion
    isDirty.value = false
  }

  async function loadFromFile(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isUnlocked) throw new Error('保险库未解锁')

    const result = await window.electronAPI.readFile(auth.filePath)
    if (!result.success) throw new Error('读取失败: ' + (result.error || '未知错误'))

    const vaultFile = JSON.parse(result.data!)
    const key = await importKeyFromBase64(auth.masterKeyBase64)
    const decrypted = await decrypt(vaultFile.ciphertext, vaultFile.nonce, vaultFile.tag, key)
    const json = new TextDecoder().decode(decrypted)
    const parsed = JSON.parse(json)
    loadVault(parsed)
  }

  /**
   * 导出保险库：直接从源文件复制，不修改源文件版本号。
   * 导出前若有未保存变更，先写入源文件。
   */
  async function exportVault(destPath: string): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isUnlocked) throw new Error('保险库未解锁')
    // 先保存当前变更到源文件（不依赖 isDirty，确保数据一致）
    if (isDirty.value) {
      await saveToFile()
    }
    const result = await window.electronAPI.copyFile(auth.filePath, destPath)
    if (!result.success) throw new Error('导出失败: ' + (result.error || '未知错误'))
  }

  async function importVault(sourcePath: string, password: string): Promise<void> {
    const result = await window.electronAPI.readFile(sourcePath)
    if (!result.success) throw new Error('无法读取文件: ' + (result.error || '未知错误'))

    const vaultFile = JSON.parse(result.data!)
    if (!vaultFile.authHash || !vaultFile.salt) throw new Error('无效的保险库文件')

    const hash = await deriveAuthToken(password)
    if (hash !== vaultFile.authHash) throw new Error('密码错误，无法导入')

    const saltBytes = base64Decode(vaultFile.salt)
    const { key, keyBase64 } = await deriveAndExportKey(password, saltBytes)
    const decrypted = await decrypt(vaultFile.ciphertext, vaultFile.nonce, vaultFile.tag, key)
    const json = new TextDecoder().decode(decrypted)
    const parsed = JSON.parse(json)

    const auth = useAuthStore()
    auth.filePath = sourcePath
    auth.masterKeyBase64 = keyBase64
    auth.salt = vaultFile.salt
    auth.authHash = vaultFile.authHash
    auth.version = vaultFile.version || 1
    loadVault(parsed)
    version.value = vaultFile.version || 1
    isDirty.value = false
  }

  return {
    entries, version, isDirty,
    loadVault, addEntry, removeEntry, updateEntry, clear,
    saveToFile, loadFromFile, exportVault, importVault
  }
})
