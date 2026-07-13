<template>
  <div class="unlock-wrapper">
    <div class="glow glow-top-left"></div>
    <div class="glow glow-bottom-right"></div>

    <div class="unlock-card">
      <div class="card-header">
        <span class="logo-icon">🔐</span>
        <h1 class="title">SecureVault</h1>
        <p class="subtitle">解锁本地保险库</p>
      </div>

      <el-form @keyup.enter="handleUnlock" class="unlock-form" label-width="80px">
        <el-form-item label="保险库文件">
          <div class="file-row">
            <el-input
              v-model="filePath"
              placeholder="选择 vault.enc 文件"
              size="large"
              class="glassy-input"
              readonly
            />
            <el-button size="large" class="browse-btn" @click="browseFile">
              浏览...
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="主密码">
          <el-input
            v-model="password"
            type="password"
            placeholder="输入主密码"
            size="large"
            show-password
            class="glassy-input"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="unlock-btn"
          :loading="loading"
          @click="handleUnlock"
        >
          {{ loading ? '解锁中...' : '🔓 解锁' }}
        </el-button>
      </el-form>

      <div class="card-footer">
        <el-divider><span class="divider-text">还没有保险库？</span></el-divider>
        <el-button text class="create-link" @click="goCreate">
          ✨ 创建新保险库 →
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useVaultStore } from '@/stores/vault'

const router = useRouter()
const authStore = useAuthStore()
const vaultStore = useVaultStore()

const filePath = ref('')
const password = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const p = await window.electronAPI?.getDefaultPath()
    if (p) filePath.value = p
  } catch { /* 回退 */ }
  // 原生菜单事件
  window.electronAPI.onMenuAction((channel) => {
    switch (channel) {
      case 'menu:create': router.push('/create'); break
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
  window.electronAPI.removeMenuActionListener()
})

async function browseFile() {
  const path = await window.electronAPI.selectOpenFile()
  if (path) filePath.value = path
}

async function handleUnlock() {
  if (!filePath.value) {
    ElMessage.warning('请选择保险库文件')
    return
  }
  if (!password.value) {
    ElMessage.warning('请输入主密码')
    return
  }

  loading.value = true
  try {
    await authStore.unlockVault(password.value, filePath.value)
    await vaultStore.loadFromFile()
    ElMessage.success('保险库已解锁')
    router.push('/vault')
  } catch (e: any) {
    ElMessage.error(e.message || '解锁失败')
  } finally {
    loading.value = false
  }
}

function goCreate() {
  router.push('/create')
}
</script>

<style scoped>
.unlock-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  position: relative;
  overflow: hidden;
}
.glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.glow-top-left {
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(168,85,247,0.2), transparent 70%);
  top: -80px; left: -80px;
}
.glow-bottom-right {
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%);
  bottom: -60px; right: -60px;
}
.unlock-card {
  width: 460px;
  max-width: 92vw;
  background: rgba(255,255,255,0.93);
  border-radius: 20px;
  padding: 40px 36px 36px;
  border: 1px solid rgba(196,181,253,0.5);
  box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(124,58,237,0.08);
  position: relative;
  z-index: 1;
}
.card-header {
  text-align: center;
  margin-bottom: 28px;
}
.logo-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}
.title {
  font-size: 32px;
  font-weight: 800;
  color: #7c3aed;
  margin-bottom: 4px;
}
.subtitle {
  font-size: 14px;
  color: #8b5cf6;
  font-weight: 500;
}
.unlock-form {
  margin-bottom: 8px;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.file-row .glassy-input {
  flex: 1;
}
.browse-btn {
  background: linear-gradient(135deg, #7c3aed, #a855f7) !important;
  border: none !important;
  color: white !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  min-width: 90px;
}
.glassy-input :deep(.el-input__wrapper) {
  background: rgba(245,243,255,0.9) !important;
  border: 2px solid #c4b5fd !important;
  border-radius: 12px !important;
  box-shadow: none !important;
  padding: 4px 16px !important;
}
.glassy-input :deep(.el-input__inner) {
  color: #1e1b4b !important;
  font-size: 15px;
  height: 48px !important;
}
.glassy-input :deep(.el-input__wrapper):hover {
  border-color: #7c3aed !important;
}
.glassy-input :deep(.el-input__wrapper.is-focus) {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important;
}
:deep(.el-form-item__label) {
  color: #6d28d9 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}
.unlock-btn {
  width: 100%;
  height: 50px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 2px;
  border: none !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #7c3aed, #a855f7) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(124,58,237,0.4) !important;
  transition: all 0.3s ease !important;
  margin-top: 8px;
}
.unlock-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124,58,237,0.5) !important;
}
.card-footer {
  text-align: center;
}
.divider-text {
  color: #a78bfa;
  font-size: 13px;
  padding: 0 12px;
}
.create-link {
  color: #7c3aed !important;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
}
.create-link:hover {
  background: rgba(124,58,237,0.08);
  color: #6d28d9 !important;
}
:deep(.el-divider) { border-top-color: #e0e7ff; }
:deep(.el-form-item) { margin-bottom: 20px; }

@media (max-width: 768px) {
  .unlock-card { padding: 28px 20px 24px; }
  .title { font-size: 26px; }
  .unlock-btn { height: 44px; font-size: 15px; }
}
</style>
