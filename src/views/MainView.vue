<template>
  <div class="main-wrapper" :style="bgStyleObj">
    <header class="top-bar">
      <div class="top-left">
        <span class="app-logo">🔐 SecureVault</span>
      </div>
      <div class="top-center">
        <el-input
          v-model="searchText"
          placeholder="🔍 搜索网站或用户名..."
          class="search-input"
          size="default"
          clearable
          @input="filterEntries"
        />
      </div>
      <div class="top-right">
        <span class="file-path" title="当前保险库文件">{{ fileName }}</span>
        <el-button text class="top-btn save-btn" @click="handleSave" :loading="saving">
          <el-icon><FolderChecked /></el-icon> 保存
        </el-button>
        <el-button text class="top-btn lock-btn" @click="handleLock">
          <el-icon><Lock /></el-icon> 锁定
        </el-button>
      </div>
    </header>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" class="add-btn" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 添加密码
        </el-button>
        <el-button class="tool-btn" @click="showGenerator">
          <el-icon><MagicStick /></el-icon> 生成器
        </el-button>
        <el-button class="tool-btn export-btn" @click="handleExport">
          <el-icon><Download /></el-icon> 导出
        </el-button>
        <el-button class="tool-btn import-btn" @click="handleImport">
          <el-icon><Upload /></el-icon> 导入
        </el-button>
        <el-button class="tool-btn theme-btn" @click="showThemeDialog">
          <el-icon><Brush /></el-icon> 主题
        </el-button>
      </div>
      <div class="toolbar-right">
        <span class="entry-count">共 {{ filteredEntries.length }} 条记录</span>
      </div>
    </div>

    <div class="table-container">
      <el-table
        :data="filteredEntries"
        stripe
        style="width: 100%"
        class="vault-table"
        :header-cell-style="{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(168,85,247,0.15))',
          color: '#1e1b4b',
          fontWeight: 900,
          fontSize: '16px',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }"
      >
        <el-table-column label="⭐" width="50" align="center">
          <template #default="{ row }">
            <span class="star" :class="{ starred: row.favorite }" @click="toggleFavorite(row)">{{ row.favorite ? '★' : '☆' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="🌐 网站" min-width="180">
          <template #default="{ row }">
            <div class="cell-with-link">
              <a class="site-link" :href="normalizeUrl(row.website)" target="_blank" rel="noopener noreferrer" @click.stop>
                <el-icon class="link-icon"><Link /></el-icon>
                {{ row.website }}
              </a>
              <el-button link class="copy-btn" @click="copyToClipboard(row.website, '网站')">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户名" min-width="160">
          <template #default="{ row }">
            <div class="cell-with-link">
              <span>{{ row.username }}</span>
              <el-button link class="copy-btn" @click="copyToClipboard(row.username, '用户名')">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="密码" min-width="160">
          <template #default="{ row }">
            <div class="cell-with-link">
              <span class="password-dots">••••••••••</span>
              <el-button type="warning" size="small" plain class="copy-pwd-inline" @click="copyToClipboard(row.password, '密码')">
                <el-icon><CopyDocument /></el-icon> 复制
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="🏷 标签" min-width="120">
          <template #default="{ row }">
            <el-tag v-if="row.tags" :type="tagType(row.tags)" size="small" class="entry-tag">{{ row.tags }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="📝 备注" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="notes-text">{{ row.notes || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ $index }">
            <el-button type="primary" link size="small" @click="showEditDialog($index)"><el-icon><Edit /></el-icon></el-button>
            <el-button type="danger" link size="small" @click="handleDelete($index)"><el-icon><Delete /></el-icon></el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mobile-cards">
        <div v-for="(row, index) in filteredEntries" :key="index" class="vault-card">
          <div class="card-header">
            <span class="star" :class="{ starred: row.favorite }" @click="toggleFavorite(row)">{{ row.favorite ? '★' : '☆' }}</span>
            <a class="site-link" :href="normalizeUrl(row.website)" target="_blank" rel="noopener noreferrer" @click.stop>{{ row.website }}</a>
            <el-tag v-if="row.tags" :type="tagType(row.tags)" size="small">{{ row.tags }}</el-tag>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="card-label">用户名</span>
              <span class="card-value">{{ row.username }}</span>
              <el-button link class="copy-btn" @click="copyToClipboard(row.username, '用户名')"><el-icon><CopyDocument /></el-icon></el-button>
            </div>
            <div class="card-row">
              <span class="card-label">密码</span>
              <span class="card-value">••••••••</span>
              <el-button type="warning" size="small" circle @click="copyToClipboard(row.password, '密码')"><el-icon><CopyDocument /></el-icon></el-button>
            </div>
            <div v-if="row.notes" class="card-row card-notes">
              <span class="card-label">备注</span>
              <span class="card-value">{{ row.notes }}</span>
            </div>
          </div>
          <div class="card-actions">
            <el-button type="primary" size="small" @click="showEditDialog(index)"><el-icon><Edit /></el-icon> 编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(index)"><el-icon><Delete /></el-icon> 删除</el-button>
          </div>
        </div>
        <div v-if="filteredEntries.length === 0" class="empty-state">
          <span class="empty-icon">🔐</span>
          <p>暂无密码记录</p>
        </div>
      </div>
    </div>

    <footer class="status-bar">
      <span :style="{ color: statusColor }">{{ statusText }}</span>
      <el-button v-if="deletedEntry" type="warning" size="small" plain @click="undoDelete" style="margin-left:12px">
        ↩ 撤销删除 (10s)
      </el-button>
    </footer>

    <el-dialog v-model="entryDialogVisible" :title="editingIndex === -1 ? '✨ 添加密码条目' : '✏️ 编辑密码条目'" width="420px" class="fancy-dialog" top="3vh">
      <el-form :model="entryForm" label-position="top" class="entry-form">
        <el-form-item label="🌐 网站"><el-input v-model="entryForm.website" placeholder="https://example.com" /></el-form-item>
        <el-form-item label="👤 用户名"><el-input v-model="entryForm.username" placeholder="user@example.com" /></el-form-item>
        <el-form-item label="🔒 密码"><el-input v-model="entryForm.password" type="password" show-password placeholder="输入密码或从生成器中复制" /></el-form-item>
        <el-form-item label="🏷 标签"><el-input v-model="entryForm.tags" placeholder="例如：社交、工作" /></el-form-item>
        <el-form-item label="⭐ 收藏">
          <el-switch v-model="entryForm.favorite" active-color="#f59e0b" inactive-color="#6b7280" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="📝 备注"><el-input v-model="entryForm.notes" type="textarea" :rows="2" placeholder="可选的备注信息" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="entryDialogVisible = false">取消</el-button>
        <el-button type="primary" class="dialog-save-btn" @click="saveEntry">{{ editingIndex === -1 ? '✨ 添加' : '💾 保存' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="genDialogVisible" title="🎲 密码生成器" width="420px" class="fancy-dialog">
      <div class="generator-body">
        <el-input v-model="generatedPassword" readonly size="large" class="gen-password">
          <template #append><el-button @click="regeneratePassword">🔄 刷新</el-button></template>
        </el-input>
        <div class="gen-options">
          <el-slider v-model="genLength" :min="8" :max="64" show-input size="small" />
          <span class="gen-label">长度: {{ genLength }}</span>
        </div>
        <div class="gen-checkboxes">
          <el-checkbox v-model="genUppercase" label="大写 A-Z" />
          <el-checkbox v-model="genLowercase" label="小写 a-z" />
          <el-checkbox v-model="genNumbers" label="数字 0-9" />
          <el-checkbox v-model="genSymbols" label="符号 !@#$%" />
        </div>
        <el-button type="warning" class="use-password-btn" @click="copyGeneratedPassword">📋 复制</el-button>
      </div>
    </el-dialog>

    <el-dialog v-model="unlockDialogVisible" title="🔓 请输入主密码" width="400px" class="fancy-dialog" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false">
      <div class="unlock-body">
        <p class="unlock-info">会话已过期，重新输入主密码以解锁保险库</p>
        <el-input v-model="unlockPassword" type="password" show-password placeholder="主密码" size="large" class="unlock-input" @keyup.enter="unlockAndRestore" />
        <el-button type="primary" class="unlock-btn" :loading="unlocking" @click="unlockAndRestore" style="width:100%;margin-top:12px">
          {{ unlocking ? '解密中...' : '🔓 解锁' }}
        </el-button>
        <el-button text class="unlock-logout" @click="handleLock">锁定保险库</el-button>
      </div>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="📥 导入保险库" width="400px" class="fancy-dialog">
      <div class="unlock-body">
        <p class="unlock-info">选择外部的 vault.enc 文件并输入该保险库的主密码</p>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <el-input v-model="importFilePath" placeholder="选择文件..." readonly size="large" class="unlock-input" style="flex:1" />
          <el-button size="large" class="browse-btn" @click="browseImportFile">浏览</el-button>
        </div>
        <el-input v-model="importPassword" type="password" show-password placeholder="该保险库的主密码" size="large" class="unlock-input" @keyup.enter="confirmImport" />
        <el-button type="warning" class="unlock-btn" :loading="importing" @click="confirmImport" style="width:100%;margin-top:12px">
          {{ importing ? '导入中...' : '📥 导入并覆盖' }}
        </el-button>
      </div>
    </el-dialog>

    <!-- 主题设置 -->
    <el-dialog v-model="themeDialogVisible" title="🎨 主题设置" width="460px" class="fancy-dialog">
      <div class="theme-body">
        <div class="theme-section">
          <span class="theme-label">背景类型</span>
          <el-radio-group v-model="tempThemeType">
            <el-radio value="default">默认</el-radio>
            <el-radio value="color">纯色</el-radio>
            <el-radio value="image">图片</el-radio>
          </el-radio-group>
        </div>
        <div v-if="tempThemeType === 'color'" class="theme-section">
          <span class="theme-label">颜色预设</span>
          <div class="color-presets">
            <div v-for="c in colorPresets" :key="c.value"
                 class="color-dot" :style="{ background: c.value }"
                 :class="{ active: tempThemeColor === c.value }"
                 :title="c.label"
                 @click="tempThemeColor = c.value" />
          </div>
          <el-color-picker v-model="tempThemeColor" show-alpha style="margin-left:10px;vertical-align:middle" />
        </div>
        <div v-if="tempThemeType === 'image'" class="theme-section">
          <span class="theme-label">背景图片</span>
          <div class="bg-image-list">
            <div class="bg-image-item" :class="{ active: tempThemeImage === '' }" @click="tempThemeImage = ''">🚫 不使用</div>
            <div v-for="img in bgImages" :key="img" class="bg-image-item" :class="{ active: tempThemeImage === img }" @click="tempThemeImage = img">
              <span class="bg-image-name">{{ img }}</span>
              <el-button link class="bg-image-del" @click.stop="handleDeleteBgImage(img)" title="删除此图片">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <div v-if="bgImages.length === 0" class="bg-empty">暂无图片，请点击下方按钮添加</div>
          </div>
          <el-button size="small" class="open-bg-btn" @click="handleImportBgImage">🖼️ 选择图片文件</el-button>
          <el-button size="small" style="margin-left:8px" @click="openBgFolder">📂 打开文件夹</el-button>
          <el-button size="small" style="margin-left:8px" @click="refreshBgImages">🔄 刷新</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelTheme">取消</el-button>
        <el-button type="primary" class="dialog-save-btn" @click="confirmTheme">✅ 确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, FolderChecked, Lock, Download, Upload,
  CopyDocument, Edit, Delete,
  MagicStick, Link, Brush, Close
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useVaultStore, type VaultEntry } from '@/stores/vault'
import { importKeyFromBase64, generateSecurePassword, evaluatePasswordStrength } from '@/crypto/index'

const router = useRouter()
const authStore = useAuthStore()
const vaultStore = useVaultStore()

// ─── 主题设置 ───
const THEME_KEY = 'securevault-theme'

interface ThemeSettings {
  type: 'default' | 'color' | 'image'
  color: string
  image: string
}

function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { type: 'default', color: '', image: '' }
}

function saveTheme(s: ThemeSettings) {
  localStorage.setItem(THEME_KEY, JSON.stringify(s))
}

const themeSettings = ref<ThemeSettings>(loadTheme())

// 对话框中临时编辑的状态（确认后才写入 themeSettings）
const themeDialogVisible = ref(false)
const tempThemeType = ref<'default' | 'color' | 'image'>('default')
const tempThemeColor = ref('#1e1b4b')
const tempThemeImage = ref('')

const bgImages = ref<string[]>([])
const bgBasePath = ref('')

const colorPresets = [
  { label: '深紫', value: '#1e1b4b' },
  { label: '墨蓝', value: '#0f172a' },
  { label: '深灰', value: '#1a1a2e' },
  { label: '暗绿', value: '#0d2818' },
  { label: '炭黑', value: '#111827' },
  { label: '深青', value: '#0c1f2b' },
  { label: '酒红', value: '#2d1b1b' },
  { label: '靛蓝', value: '#1a1a3e' },
]

const bgImageDataUrl = ref('')

async function loadBgImageDataUrl(filename: string) {
  if (!filename) {
    bgImageDataUrl.value = ''
    return
  }
  try {
    const dataUrl = await window.electronAPI?.readBgImage(filename)
    bgImageDataUrl.value = dataUrl || ''
  } catch {
    bgImageDataUrl.value = ''
  }
}

const bgStyleObj = computed(() => {
  const bg = themeSettings.value
  if (bg.type === 'color' && bg.color) {
    return { backgroundColor: bg.color, backgroundImage: 'none' }
  }
  if (bg.type === 'image' && bg.image && bgImageDataUrl.value) {
    return {
      backgroundImage: `url("${bgImageDataUrl.value}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }
  }
  // 默认渐变 + 背景图
  return {
    backgroundImage: `linear-gradient(rgba(15,12,41,0.15), rgba(36,36,62,0.25)), url(/image/1.png)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  }
})

function showThemeDialog() {
  // 打开对话框时，复制当前设置到临时状态
  tempThemeType.value = themeSettings.value.type
  tempThemeColor.value = themeSettings.value.color || '#1e1b4b'
  tempThemeImage.value = themeSettings.value.image || ''
  themeDialogVisible.value = true
  refreshBgImages()
}

async function confirmTheme() {
  // 确认：将临时状态写入正式设置并保存
  themeSettings.value = {
    type: tempThemeType.value,
    color: tempThemeType.value === 'color' ? tempThemeColor.value : '',
    image: tempThemeType.value === 'image' ? tempThemeImage.value : '',
  }
  saveTheme(themeSettings.value)
  // 如果是图片类型，通过 IPC 加载 data URL（绕过 CSP file:// 限制）
  if (themeSettings.value.type === 'image' && themeSettings.value.image) {
    await loadBgImageDataUrl(themeSettings.value.image)
  } else {
    bgImageDataUrl.value = ''
  }
  themeDialogVisible.value = false
}

function cancelTheme() {
  // 取消：直接关闭，不保存临时状态
  themeDialogVisible.value = false
}

async function handleImportBgImage() {
  try {
    const imported = await window.electronAPI?.importBgImage()
    if (imported && imported.length > 0) {
      await refreshBgImages()
      // 自动选中第一张导入的图片
      tempThemeImage.value = imported[0]
      ElMessage.success(`已导入 ${imported.length} 张图片`)
    }
  } catch { /* ignore */ }
}

async function handleDeleteBgImage(filename: string) {
  try {
    await ElMessageBox.confirm(`确定要删除 "${filename}" 吗？`, '确认删除', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    const ok = await window.electronAPI?.deleteBgImage(filename)
    if (ok) {
      // 如果删除的是当前选中的图片，清除选择
      if (tempThemeImage.value === filename) {
        tempThemeImage.value = ''
      }
      // 如果删除的是当前应用的图片，清除 data URL
      if (themeSettings.value.image === filename) {
        bgImageDataUrl.value = ''
      }
      await refreshBgImages()
      ElMessage.success('已删除')
    }
  } catch { /* 用户取消或删除失败 */ }
}

async function refreshBgImages() {
  try {
    bgBasePath.value = await window.electronAPI?.getBgPath() || ''
    bgImages.value = await window.electronAPI?.listBgImages() || []
  } catch { /* ignore */ }
}

async function openBgFolder() {
  try {
    await window.electronAPI?.openBgFolder()
    // 延迟刷新列表
    setTimeout(() => refreshBgImages(), 1500)
  } catch { /* ignore */ }
}

const fileName = computed(() => {
  if (!authStore.filePath) return ''
  const parts = authStore.filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || authStore.filePath
})

const searchText = ref('')
const filteredEntries = ref<VaultEntry[]>([])

function filterEntries() {
  if (!searchText.value) {
    filteredEntries.value = [...vaultStore.entries]
    return
  }
  const q = searchText.value.toLowerCase()
  filteredEntries.value = vaultStore.entries.filter(e =>
    (e.website && e.website.toLowerCase().includes(q)) ||
    (e.username && e.username.toLowerCase().includes(q)) ||
    (e.tags && e.tags.toLowerCase().includes(q))
  )
}

function toggleFavorite(row: VaultEntry) {
  row.favorite = !row.favorite
  const originalIndex = vaultStore.entries.findIndex(e => e.id === row.id)
  if (originalIndex !== -1) {
    vaultStore.entries[originalIndex].favorite = row.favorite
  }
}

let clipboardTimer: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制，10秒后自动清空`)
    if (clipboardTimer) clearTimeout(clipboardTimer)
    clipboardTimer = setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {
        // 剪切板自动清空失败（如页面失焦、权限不足），提醒用户
        ElMessage.warning('剪切板未能自动清空，请手动复制其他内容覆盖', 5000)
      })
    }, 10_000)
  } catch {
    ElMessage.error('复制失败')
  }
}

function normalizeUrl(url: string): string {
  if (!url) return '#'
  return url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url
}

const tagColors: Record<string, string> = {
  '社交': 'success', '工作': 'primary', '银行': 'warning',
  '娱乐': 'info', '购物': 'danger', '邮箱': '',
}

function tagType(tag: string): string {
  return tagColors[tag] || ''
}

const statusText = ref('就绪')
const statusColor = ref('#10b981')

const saving = ref(false)

async function handleSave() {
  saving.value = true
  statusText.value = '⏳ 保存中...'
  statusColor.value = '#a78bfa'
  try {
    await vaultStore.saveToFile()
    statusText.value = '✅ 已保存'
    statusColor.value = '#10b981'
    ElMessage.success('保险库已保存')
  } catch (e: any) {
    statusText.value = '❌ 保存失败'
    statusColor.value = '#f87171'
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

async function handleExport() {
  const defaultName = authStore.filePath.replace(/\\/g, '/').split('/').pop() || 'vault.enc'
  const destPath = await window.electronAPI.selectSaveFile(
    authStore.filePath.replace(/[^/\\]*$/, '') + defaultName
  )
  if (!destPath) return
  try {
    await vaultStore.exportVault(destPath)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error('导出失败: ' + (e.message || '未知错误'))
  }
}

const importDialogVisible = ref(false)
const importFilePath = ref('')
const importPassword = ref('')
const importing = ref(false)

async function handleImport() {
  importFilePath.value = ''
  importPassword.value = ''
  importDialogVisible.value = true
}

async function browseImportFile() {
  const path = await window.electronAPI.selectOpenFile()
  if (path) importFilePath.value = path
}

async function confirmImport() {
  if (!importFilePath.value) { ElMessage.warning('请选择要导入的保险库文件'); return }
  if (!importPassword.value) { ElMessage.warning('请输入该保险库的主密码'); return }
  importing.value = true
  try {
    // 导入前自动备份当前 vault
    if (authStore.isUnlocked && authStore.filePath) {
      const bakPath = authStore.filePath + '.bak'
      await window.electronAPI.copyFile(authStore.filePath, bakPath).catch(() => {})
    }
    await vaultStore.importVault(importFilePath.value, importPassword.value)
    filterEntries()
    importDialogVisible.value = false
    statusText.value = '✅ 已导入'
    statusColor.value = '#10b981'
    ElMessage.success('保险库已导入并切换')
  } catch (e: any) {
    ElMessage.error('导入失败: ' + (e.message || '未知错误'))
  } finally {
    importing.value = false
  }
}

const entryDialogVisible = ref(false)
const editingIndex = ref(-1)

function createEmptyForm() {
  return { website: '', username: '', password: '', tags: '', notes: '', favorite: false }
}

const entryForm = reactive(createEmptyForm())

function resetForm() { Object.assign(entryForm, createEmptyForm()) }

function showAddDialog() {
  editingIndex.value = -1
  resetForm()
  entryDialogVisible.value = true
}

function showEditDialog(index: number) {
  editingIndex.value = index
  const entry = filteredEntries.value[index]
  entryForm.website = entry.website || ''
  entryForm.username = entry.username || ''
  entryForm.password = entry.password || ''
  entryForm.tags = entry.tags || ''
  entryForm.notes = entry.notes || ''
  entryForm.favorite = entry.favorite || false
  entryDialogVisible.value = true
}

async function saveEntry() {
  if (!entryForm.website || !entryForm.username || !entryForm.password) {
    ElMessage.warning('请填写网站、用户名和密码')
    return
  }
  const entry: VaultEntry = {
    id: '',
    website: entryForm.website,
    username: entryForm.username,
    password: entryForm.password,
    tags: entryForm.tags || undefined,
    notes: entryForm.notes || undefined,
    favorite: entryForm.favorite,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  if (editingIndex.value === -1) {
    entry.id = crypto.randomUUID()
    vaultStore.addEntry(entry)
    ElMessage.success('✅ 条目已添加')
  } else {
    const targetId = filteredEntries.value[editingIndex.value].id
    const originalIndex = vaultStore.entries.findIndex(e => e.id === targetId)
    if (originalIndex !== -1) {
      entry.id = targetId
      entry.createdAt = vaultStore.entries[originalIndex].createdAt
      vaultStore.updateEntry(originalIndex, entry)
    }
    ElMessage.success('✅ 条目已更新')
  }
  entryDialogVisible.value = false
  filterEntries()
  try {
    await vaultStore.saveToFile()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  }
}

const deletedEntry = ref<VaultEntry | null>(null)

async function handleDelete(index: number) {
  try {
    await ElMessageBox.confirm('确定要删除此条目吗？', '确认删除', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
    const targetId = filteredEntries.value[index].id
    const originalIndex = vaultStore.entries.findIndex(e => e.id === targetId)
    if (originalIndex === -1) return
    const removed = { ...vaultStore.entries[originalIndex] }
    vaultStore.removeEntry(originalIndex)
    filterEntries()
    try { await vaultStore.saveToFile() } catch { }
    deletedEntry.value = removed
    ElMessage({ message: '已删除（10秒内可撤销）', type: 'warning', duration: 5000, showClose: false })
    setTimeout(() => {
      if (deletedEntry.value?.id === removed.id) deletedEntry.value = null
    }, 10_000)
  } catch { }
}

function undoDelete() {
  if (!deletedEntry.value) return
  vaultStore.addEntry(deletedEntry.value)
  deletedEntry.value = null
  filterEntries()
  vaultStore.saveToFile().catch(() => {})
  ElMessage.success('已撤销删除')
}

const genDialogVisible = ref(false)
const generatedPassword = ref('')
const genLength = ref(16)
const genUppercase = ref(true)
const genLowercase = ref(true)
const genNumbers = ref(true)
const genSymbols = ref(true)

function showGenerator() {
  regeneratePassword()
  genDialogVisible.value = true
}

function regeneratePassword() {
  if (!genUppercase.value && !genLowercase.value && !genNumbers.value && !genSymbols.value) {
    ElMessage.warning('请至少选择一种字符类型')
    return
  }
  generatedPassword.value = generateSecurePassword(
    genLength.value,
    genUppercase.value,
    genLowercase.value,
    genNumbers.value,
    genSymbols.value,
  )
}

function copyGeneratedPassword() {
  copyToClipboard(generatedPassword.value, '密码')
}

const unlockDialogVisible = ref(false)
const unlockPassword = ref('')
const unlocking = ref(false)

async function unlockAndRestore() {
  if (!unlockPassword.value) { ElMessage.warning('请输入主密码'); return }
  unlocking.value = true
  try {
    await authStore.unlockVault(unlockPassword.value, authStore.filePath)
    await vaultStore.loadFromFile()
    filterEntries()
    unlockDialogVisible.value = false
    statusText.value = '✅ 已解锁'
    statusColor.value = '#10b981'
    ElMessage.success('保险库已解锁')
  } catch (e: any) {
    ElMessage.error('解锁失败: ' + (e.message || '密码错误'))
  } finally {
    unlocking.value = false
  }
}

function handleLock() {
  statusText.value = '🔒 已锁定'
  statusColor.value = '#f59e0b'
  vaultStore.clear()
  authStore.lock()
  router.push('/unlock')
}

const AUTO_LOCK_MS = 5 * 60 * 1000
let autoLockTimer: ReturnType<typeof setTimeout> | null = null

function resetAutoLockTimer() {
  if (autoLockTimer) clearTimeout(autoLockTimer)
  if (!authStore.isUnlocked) return
  autoLockTimer = setTimeout(() => {
    if (unlockDialogVisible.value) return
    unlockPassword.value = ''
    unlockDialogVisible.value = true
    filteredEntries.value = []
    statusText.value = '🔒 已自动锁定（5分钟无操作）'
    statusColor.value = '#f59e0b'
  }, AUTO_LOCK_MS)
}

onMounted(async () => {
  // 加载已保存的背景图片（通过 IPC 转 data URL，绕过 CSP file:// 限制）
  if (themeSettings.value.type === 'image' && themeSettings.value.image) {
    await loadBgImageDataUrl(themeSettings.value.image)
  }
  if (authStore.isUnlocked) {
    if (vaultStore.entries.length === 0) {
      try { await vaultStore.loadFromFile() } catch { }
    }
    filterEntries()
    resetAutoLockTimer()
  }
  window.addEventListener('mousemove', resetAutoLockTimer)
  window.addEventListener('keydown', resetAutoLockTimer)
  window.addEventListener('touchstart', resetAutoLockTimer)
  window.addEventListener('wheel', resetAutoLockTimer)
  // 全局快捷键 Ctrl+Shift+L 锁定
  window.electronAPI.onLockShortcut(() => {
    handleLock()
  })
  // 原生菜单事件
  window.electronAPI.onMenuAction((channel) => {
    switch (channel) {
      case 'menu:save': handleSave(); break
      case 'menu:export': handleExport(); break
      case 'menu:import': handleImport(); break
      case 'menu:create': router.push('/create'); break
      case 'menu:open': handleLock(); router.push('/unlock'); break
      case 'menu:help':
        ElMessageBox.alert(
          'SecureVault 使用说明：\n\n1. 创建保险库 → 设置主密码并选择存储位置\n2. 解锁保险库 → 选择 .enc 文件并输入主密码\n3. 添加密码条目 → 填写网站、用户名、密码\n4. 使用密码生成器创建高强度密码\n5. 点击复制按钮快速复制密码\n6. 定时保存或使用 Ctrl+S 快捷键\n7. 离开时锁定保险库或等待自动锁定（5分钟）\n\n⚠️ 请牢记主密码，忘记无法恢复！',
          '📖 使用说明',
          { type: 'info', confirmButtonText: '知道了' }
        )
        break
      case 'menu:about':
        ElMessageBox.alert(
          '🔐 SecureVault v1.0.0\n\n零知识密码管理器\n本地加密 · 离线安全\n\n基于 AES-256-GCM + PBKDF2 加密\n您的数据始终在本地，绝不上传',
          '关于 SecureVault',
          { type: 'info', confirmButtonText: '确定' }
        )
        break
    }
  })
})

onUnmounted(() => {
  if (autoLockTimer) clearTimeout(autoLockTimer)
  window.removeEventListener('mousemove', resetAutoLockTimer)
  window.removeEventListener('keydown', resetAutoLockTimer)
  window.removeEventListener('touchstart', resetAutoLockTimer)
  window.removeEventListener('wheel', resetAutoLockTimer)
  window.electronAPI.removeLockShortcutListener()
  window.electronAPI.removeMenuActionListener()
})
</script>

<style scoped>
.main-wrapper {
  width: 100%; height: 100vh; display: flex; flex-direction: column;
  background-size: cover; background-position: center; background-attachment: fixed;
}
.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: rgba(15,12,41,0.85);
  backdrop-filter: blur(12px); border-bottom: 1px solid rgba(124,58,237,0.2); flex-shrink: 0;
}
.app-logo { font-size: 20px; font-weight: 800; color: #a855f7; }
.top-center { flex: 1; max-width: 400px; margin: 0 24px; }
.search-input {
  --el-input-bg-color: rgba(255,255,255,0.08) !important;
  --el-input-text-color: #e2e8f0 !important;
  --el-input-border-color: rgba(124,58,237,0.3) !important;
  --el-input-hover-border-color: #7c3aed !important;
  --el-input-focus-border-color: #a855f7 !important;
  --el-input-placeholder-color: rgba(255,255,255,0.3) !important;
}
.search-input :deep(.el-input__wrapper) {
  border-radius: 10px !important; background: rgba(255,255,255,0.06) !important;
  box-shadow: none !important; border: 1px solid rgba(124,58,237,0.2) !important;
}
.search-input :deep(.el-input__inner) { color: #e2e8f0 !important; }
.top-right { display: flex; align-items: center; gap: 8px; }
.file-path {
  color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 500;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.top-btn {
  color: #c4b5fd !important; font-size: 13px !important; font-weight: 600 !important;
  padding: 6px 12px !important; border-radius: 8px !important; transition: all 0.2s !important;
}
.top-btn:hover { background: rgba(124,58,237,0.15) !important; color: #ffffff !important; }
.save-btn { color: #10b981 !important; }
.save-btn:hover { background: rgba(16,185,129,0.1) !important; }
.lock-btn:hover { color: #f59e0b !important; background: rgba(245,158,11,0.1) !important; }
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: rgba(15,12,41,0.6); backdrop-filter: blur(8px); flex-shrink: 0;
}
.toolbar-left { display: flex; gap: 10px; }
.add-btn {
  background: linear-gradient(135deg, #7c3aed, #a855f7) !important; border: none !important;
  border-radius: 10px !important; font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(124,58,237,0.3) !important; transition: all 0.2s !important;
}
.add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,58,237,0.4) !important; }
.tool-btn {
  background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.08) !important;
  color: #c4b5fd !important; border-radius: 10px !important; font-weight: 500 !important; transition: all 0.2s !important;
}
.tool-btn:hover { background: rgba(124,58,237,0.15) !important; border-color: rgba(124,58,237,0.3) !important; color: #a78bfa !important; }
.export-btn { color: #34d399 !important; }
.export-btn:hover { background: rgba(52,211,153,0.1) !important; color: #6ee7b7 !important; }
.import-btn { color: #60a5fa !important; }
.import-btn:hover { background: rgba(96,165,250,0.1) !important; color: #93c5fd !important; }
.toolbar-right { color: rgba(255,255,255,0.7); font-size: 13px; }
.entry-count { background: rgba(255,255,255,0.04); padding: 4px 12px; border-radius: 20px; }
.table-container {
  flex: 1; overflow-y: auto; padding: 16px 24px;
  background: rgba(15,12,41,0.12); backdrop-filter: blur(4px);
}
.vault-table {
  border-radius: 12px !important; overflow: hidden !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  --el-table-border-color: rgba(255,255,255,0.08) !important;
  --el-table-header-bg-color: transparent !important;
  --el-table-header-text-color: #1e1b4b !important;
}
.vault-table :deep(.el-table__body-wrapper) {
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.2); border-radius: 3px; }
}
.vault-table :deep(.el-table__row) { transition: background 0.15s; }
.vault-table :deep(.el-table__row:hover td) { background: rgba(124,58,237,0.1) !important; }
.vault-table :deep(td.el-table__cell) {
  background: rgba(255,255,255,0.72) !important;
  border-bottom: 1px solid rgba(0,0,0,0.06) !important; color: #000000 !important; font-weight: 700;
}
.vault-table :deep(.el-table__header-wrapper th) { border-bottom: 1px solid rgba(255,255,255,0.06) !important; }
.cell-with-link { display: flex; align-items: center; gap: 6px; }
.site-link {
  color: #7c3aed; text-decoration: none; font-weight: 700;
  display: inline-flex; align-items: center; gap: 3px; transition: all 0.2s; cursor: pointer;
}
.site-link:hover { color: #5b21b6; text-decoration: underline; }
.link-icon { font-size: 14px; opacity: 0.7; }
.site-link:hover .link-icon { opacity: 1; }
.copy-btn {
  color: #7c3aed !important; font-size: 14px !important; opacity: 0.5;
  transition: all 0.2s !important; padding: 2px !important;
}
.copy-btn:hover { opacity: 1 !important; color: #5b21b6 !important; transform: scale(1.15); }
.copy-pwd-inline {
  border-radius: 6px !important; font-weight: 600 !important; flex-shrink: 0;
}
.star { cursor: pointer; font-size: 18px; transition: all 0.2s; color: rgba(0,0,0,0.35); }
.star.starred { color: #d97706; }
.star:hover { transform: scale(1.2); }
.entry-tag {
  --el-tag-bg-color: rgba(124,58,237,0.12) !important;
  --el-tag-border-color: rgba(124,58,237,0.25) !important;
  --el-tag-text-color: #5b21b6 !important;
  border-radius: 6px !important; font-weight: 700 !important;
}
.notes-text { color: rgba(0,0,0,0.6); font-size: 13px; font-weight: 600; }
.status-bar {
  display: flex; align-items: center; padding: 8px 24px;
  background: rgba(15,12,41,0.85); backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255,255,255,0.04); flex-shrink: 0;
}
.status-bar span { font-size: 13px; font-weight: 500; }
.fancy-dialog :deep(.el-dialog) {
  background: rgba(30,27,75,0.96) !important;
  border: 1px solid rgba(124,58,237,0.25) !important;
  border-radius: 16px !important; backdrop-filter: blur(20px);
  box-shadow: 0 25px 60px rgba(0,0,0,0.5) !important;
}
.fancy-dialog :deep(.el-dialog__header) { padding: 24px 28px 0 !important; }
.fancy-dialog :deep(.el-dialog__title) { color: #e2e8f0 !important; font-weight: 700 !important; font-size: 20px !important; }
.fancy-dialog :deep(.el-dialog__body) { padding: 20px 28px !important; }
.fancy-dialog :deep(.el-dialog__footer) {
  padding: 0 28px 24px !important; border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 8px; padding-top: 16px !important;
}
.entry-form :deep(.el-form-item__label) { color: #c4b5fd !important; font-weight: 500 !important; }
.entry-form :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(124,58,237,0.2) !important;
  box-shadow: none !important; border-radius: 8px !important;
}
.entry-form :deep(.el-input__inner) { color: #e2e8f0 !important; }
.entry-form :deep(.el-input__wrapper):hover, .entry-form :deep(.el-input__wrapper.is-focus) { border-color: #7c3aed !important; }
.entry-form :deep(.el-textarea__inner) {
  background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(124,58,237,0.2) !important;
  color: #e2e8f0 !important; box-shadow: none !important; border-radius: 8px !important;
}
.entry-form :deep(.el-textarea__inner):focus { border-color: #7c3aed !important; }
.dialog-save-btn {
  background: linear-gradient(135deg, #7c3aed, #a855f7) !important; border: none !important;
  border-radius: 10px !important; font-weight: 600 !important; padding: 8px 24px !important;
}
.dialog-save-btn:hover { background: linear-gradient(135deg, #6d28d9, #9333ea) !important; transform: translateY(-1px); }
.generator-body { padding: 8px 0; }
.gen-password { font-size: 18px !important; font-family: 'Courier New', monospace !important; letter-spacing: 1px; margin-bottom: 16px; }
.gen-password :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.04) !important; border: 2px solid rgba(245,158,11,0.3) !important;
  box-shadow: none !important; border-radius: 10px 0 0 10px !important;
}
.gen-password :deep(.el-input__inner) { color: #fbbf24 !important; font-weight: 600 !important; text-align: center; }
.gen-password :deep(.el-input-group__append) {
  background: rgba(245,158,11,0.1) !important; border: 2px solid rgba(245,158,11,0.3) !important; border-left: none !important;
}
.gen-password :deep(.el-input-group__append .el-button) { color: #fbbf24 !important; }
.gen-options { margin: 16px 0; padding: 0 4px; }
.gen-label { display: block; text-align: center; color: #94a3b8; font-size: 13px; margin-top: 4px; }
.gen-checkboxes { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
.gen-checkboxes :deep(.el-checkbox__label) { color: #cbd5e1 !important; font-size: 13px; }
.gen-checkboxes :deep(.el-checkbox__input.is-checked .el-checkbox__inner) { background-color: #f59e0b !important; border-color: #f59e0b !important; }
.use-password-btn { width: 100%; margin-top: 8px; border-radius: 10px !important; font-weight: 600 !important; padding: 12px !important; }
.unlock-body { padding: 12px 0; text-align: center; }
.unlock-info { color: #94a3b8; font-size: 14px; margin-bottom: 16px; line-height: 1.5; }
.unlock-input :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(124,58,237,0.3) !important;
  box-shadow: none !important; border-radius: 10px !important;
}
.unlock-input :deep(.el-input__inner) { color: #e2e8f0 !important; height: 46px !important; }
.browse-btn {
  background: linear-gradient(135deg, #7c3aed, #a855f7) !important; border: none !important;
  color: white !important; border-radius: 10px !important; font-weight: 600 !important;
}
.unlock-btn { border-radius: 10px !important; font-weight: 600 !important; height: 44px !important; font-size: 15px !important; }
.unlock-logout { margin-top: 10px; color: #94a3b8 !important; font-size: 13px !important; }
.unlock-logout:hover { color: #f59e0b !important; }
.mobile-cards { display: none; }
@media (max-width: 768px) {
  .vault-table { display: none !important; }
  .mobile-cards { display: block !important; }
  .top-bar { flex-wrap: wrap; padding: 8px 12px; }
  .top-left { width: 100%; margin-bottom: 6px; }
  .app-logo { font-size: 17px; }
  .top-center { flex: 1; max-width: 100%; margin: 0; }
  .top-right { width: 100%; justify-content: flex-end; margin-top: 6px; }
  .file-path { display: none; }
  .top-btn { font-size: 12px !important; padding: 4px 8px !important; }
  .toolbar { flex-wrap: wrap; padding: 8px 12px; gap: 6px; }
  .toolbar-left { flex: 1; flex-wrap: wrap; }
  .toolbar-right { width: 100%; text-align: center; }
  .entry-count { font-size: 12px; }
  .table-container { padding: 8px; }
  .status-bar { padding: 6px 12px; }
  .status-bar span { font-size: 11px; }
  .fancy-dialog :deep(.el-dialog) {
    width: 96% !important; margin: 10px auto !important; border-radius: 12px !important;
    max-height: 90vh; overflow-y: auto;
  }
  .fancy-dialog :deep(.el-dialog__header) { padding: 14px 14px 0 !important; }
  .fancy-dialog :deep(.el-dialog__title) { font-size: 17px !important; }
  .fancy-dialog :deep(.el-dialog__body) { padding: 10px 14px !important; }
  .fancy-dialog :deep(.el-dialog__footer) { padding: 0 14px 14px !important; }
  .fancy-dialog :deep(.el-form-item) { margin-bottom: 12px !important; }
}
.vault-card {
  background: rgba(255,255,255,0.88); border-radius: 12px; padding: 14px;
  margin-bottom: 10px; border: 1px solid rgba(124,58,237,0.15);
}
.vault-card .card-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.06);
}
.vault-card .card-header .site-link {
  flex: 1; color: #7c3aed; font-weight: 700; font-size: 15px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.vault-card .card-body { margin-bottom: 6px; }
.vault-card .card-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
.vault-card .card-label { color: #6b7280; font-size: 12px; min-width: 36px; }
.vault-card .card-value {
  flex: 1; color: #1e1b4b; font-weight: 600; font-size: 14px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.vault-card .card-notes .card-value { font-weight: 400; color: #6b7280; font-size: 13px; }
.vault-card .card-actions {
  display: flex; gap: 8px; margin-top: 8px; padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.05);
}
.empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.5); }
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

/* 主题设置 */
.theme-body { padding: 4px 0; }
.theme-section { margin-bottom: 20px; }
.theme-label { display: block; color: #c4b5fd; font-weight: 600; font-size: 14px; margin-bottom: 10px; }
.color-presets { display: inline-flex; gap: 8px; flex-wrap: wrap; vertical-align: middle; }
.color-dot {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: all 0.2s;
}
.color-dot:hover { transform: scale(1.15); }
.color-dot.active { border-color: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.bg-image-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; max-height: 160px; overflow-y: auto; }
.bg-image-item {
  padding: 6px 14px; background: rgba(255,255,255,0.06); border-radius: 8px;
  cursor: pointer; color: #94a3b8; font-size: 13px; border: 1px solid transparent;
  transition: all 0.2s; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: center; gap: 6px;
}
.bg-image-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.bg-image-del {
  color: #f87171 !important; font-size: 14px !important; opacity: 0; transition: opacity 0.2s; flex-shrink: 0;
}
.bg-image-item:hover .bg-image-del { opacity: 1; }
.bg-image-del:hover { color: #ef4444 !important; transform: scale(1.2); }
.bg-image-item:hover { background: rgba(124,58,237,0.15); color: #c4b5fd; }
.bg-image-item.active { border-color: #7c3aed; background: rgba(124,58,237,0.2); color: #e2e8f0; }
.bg-empty { color: #64748b; font-size: 13px; padding: 12px; }
.open-bg-btn {
  background: rgba(124,58,237,0.15) !important; border: 1px solid rgba(124,58,237,0.3) !important;
  color: #c4b5fd !important; border-radius: 8px !important; font-weight: 500 !important;
}
.open-bg-btn:hover { background: rgba(124,58,237,0.25) !important; }
.theme-btn { color: #c084fc !important; }
.theme-btn:hover { background: rgba(192,132,252,0.1) !important; }

.theme-section :deep(.el-radio) { margin-right: 16px; }
.theme-section :deep(.el-radio__label) { color: #cbd5e1 !important; }
</style>
