<template>
  <div class="create-wrapper">
    <div class="glow glow-top-right"></div>
    <div class="glow glow-bottom-left"></div>

    <div class="create-card">
      <div class="card-header">
        <span class="logo-icon">✨</span>
        <h1 class="title">创建保险库</h1>
        <p class="subtitle">设置主密码，安全存储你的密码</p>
      </div>

      <el-form @keyup.enter="handleCreate" class="create-form" label-width="80px">
        <el-form-item label="主密码">
          <el-input
            v-model="password"
            type="password"
            placeholder="至少 8 位"
            size="large"
            show-password
            class="glassy-input"
          />
          <div class="strength-bar" v-if="password">
            <div class="strength-track">
              <div class="strength-fill" :style="{ width: strength.percent + '%', background: strength.color }"></div>
            </div>
            <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
          </div>
        </el-form-item>

        <el-form-item label="确认密码">
          <el-input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入主密码"
            size="large"
            show-password
            class="glassy-input"
          />
        </el-form-item>

        <el-form-item label="保存位置">
          <div class="file-row">
            <el-input
              v-model="savePath"
              placeholder="选择保存位置"
              size="large"
              class="glassy-input"
              readonly
            />
            <el-button size="large" class="browse-btn" @click="browseSave">
              浏览...
            </el-button>
          </div>
        </el-form-item>

        <p class="hint">🔐 请牢记主密码！忘记密码将无法恢复数据</p>

        <el-button
          type="success"
          size="large"
          class="create-btn"
          :loading="loading"
          @click="handleCreate"
        >
          {{ loading ? '创建中...' : '✨ 创建保险库' }}
        </el-button>
      </el-form>

      <div class="card-footer">
        <el-divider><span class="divider-text">已有保险库？</span></el-divider>
        <el-button text class="back-link" @click="goUnlock">
          ← 返回解锁
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useVaultStore } from '@/stores/vault'
import { evaluatePasswordStrength } from '@/crypto/index'

const router = useRouter()
const authStore = useAuthStore()
const vaultStore = useVaultStore()

const password = ref('')
const confirmPassword = ref('')
const savePath = ref('')
const loading = ref(false)

/** 密码强度评估 */
const strength = computed(() => evaluatePasswordStrength(password.value))

onMounted(async () => {
  try {
    const p = await window.electronAPI?.getDefaultPath()
    if (p) savePath.value = p
  } catch { /* 回退 */ }
  // 原生菜单事件
  window.electronAPI.onMenuAction((channel) => {
    switch (channel) {
      case 'menu:open': router.push('/unlock'); break
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

async function browseSave() {
  if (!window.electronAPI) {
    ElMessage.error('系统接口未就绪，请重启应用')
    return
  }
  const path = await window.electronAPI.selectSaveFile(savePath.value)
  if (path) savePath.value = path
}

async function handleCreate() {
  if (!password.value) {
    ElMessage.warning('请设置主密码')
    return
  }
  if (password.value.length < 8) {
    ElMessage.warning('主密码至少需要 8 位')
    return
  }
  if (password.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (!savePath.value) {
    ElMessage.warning('请选择保险库保存位置')
    return
  }

  loading.value = true
  try {
    // 1. 生成密钥材料（auth.version 设为 0）
    await authStore.createVault(password.value, savePath.value)
    // 2. 初始化空条目列表
    vaultStore.loadVault({ version: 1, entries: [] })
    // 3. 统一通过 saveToFile 加密并写入（auth.version 0 → 写入 version 1）
    vaultStore.isDirty = true
    await vaultStore.saveToFile()
    // 4. 加载到内存
    vaultStore.loadVault({ version: 1, entries: [] })
    ElMessage.success('保险库创建成功！')
    router.push('/vault')
  } catch (e: any) {
    ElMessage.error('创建失败: ' + (e.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function goUnlock() {
  router.push('/unlock')
}
</script>

<style scoped>
.create-wrapper {
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
.glow-top-right {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(5,150,105,0.2), transparent 70%);
  top: -80px; right: -60px;
}
.glow-bottom-left {
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%);
  bottom: -60px; left: -60px;
}
.create-card {
  width: 480px;
  max-width: 92vw;
  background: rgba(255,255,255,0.93);
  border-radius: 20px;
  padding: 36px 36px 32px;
  border: 1px solid rgba(167,243,208,0.5);
  box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(5,150,105,0.08);
  position: relative;
  z-index: 1;
}
.card-header {
  text-align: center;
  margin-bottom: 24px;
}
.logo-icon {
  font-size: 44px;
  display: block;
  margin-bottom: 6px;
}
.title {
  font-size: 28px;
  font-weight: 800;
  color: #059669;
  margin-bottom: 4px;
}
.subtitle {
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
}
.create-form {
  margin-bottom: 4px;
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
  background: linear-gradient(135deg, #059669, #10b981) !important;
  border: none !important;
  color: white !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  min-width: 90px;
}
.glassy-input :deep(.el-input__wrapper) {
  background: rgba(236,253,245,0.9) !important;
  border: 2px solid #a7f3d0 !important;
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
  border-color: #059669 !important;
}
.glassy-input :deep(.el-input__wrapper.is-focus) {
  border-color: #059669 !important;
  box-shadow: 0 0 0 3px rgba(5,150,105,0.1) !important;
}
:deep(.el-form-item__label) {
  color: #047857 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}
.hint {
  font-size: 12px;
  color: #dc2626;
  margin: -8px 0 12px 4px;
  line-height: 1.4;
  font-weight: 500;
}
.create-btn {
  width: 100%;
  height: 50px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  border: none !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #059669, #10b981) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(5,150,105,0.4) !important;
  transition: all 0.3s ease !important;
}
.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(5,150,105,0.5) !important;
}
.card-footer { text-align: center; }
.divider-text {
  color: #6ee7b7;
  font-size: 13px;
  padding: 0 12px;
}
.back-link {
  color: #7c3aed !important;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
}
.back-link:hover {
  background: rgba(124,58,237,0.08);
  color: #6d28d9 !important;
}
:deep(.el-divider) { border-top-color: #d1fae5; }
:deep(.el-form-item) { margin-bottom: 18px; }

.strength-bar {
  display: flex; align-items: center; gap: 8px; margin-top: 8px;
}
.strength-track {
  flex: 1; height: 6px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden;
}
.strength-fill {
  height: 100%; border-radius: 3px; transition: width 0.3s ease, background 0.3s ease;
}
.strength-label {
  font-size: 12px; font-weight: 600; white-space: nowrap; min-width: 32px;
}

@media (max-width: 768px) {
  .create-card { padding: 24px 20px 20px; }
  .title { font-size: 24px; }
  .create-btn { height: 44px; font-size: 15px; }
}
</style>
