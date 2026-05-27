<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="../../logo.png" alt="Logo" class="login-logo" />
        <h1 class="login-title">福建港航船舶报告编制系统</h1>
        <p class="login-subtitle">Fujian Port Ship Report System</p>
      </div>
      <el-form ref="formRef" :model="loginForm" :rules="rules" @keyup.enter="handleLogin">
        <el-form-item prop="phone">
          <el-input
            v-model="loginForm.phone"
            placeholder="请输入手机号"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        <span>测试账号：13800138001 / 123456</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../api/auth'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  phone: '',
  password: ''
})

const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const res = await login(loginForm)
      const { token, user, permissions } = res.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('permissions', JSON.stringify(permissions))
      ElMessage.success('登录成功')
      router.push('/')
    } catch (e) {
      // error handled by interceptor
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0A3D62 0%, #1E5A8A 50%, #3498db 100%);
}

.login-card {
  width: 420px;
  padding: 48px 40px 36px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 16px;
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: #0A3D62;
  margin: 0 0 8px 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.login-subtitle {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.login-button {
  width: 100%;
  background: #0A3D62;
  border-color: #0A3D62;
  font-size: 16px;
  letter-spacing: 4px;
  height: 48px;
  border-radius: 8px;
  transition: all 0.3s;
}

.login-button:hover {
  background: #082C48;
  border-color: #082C48;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  color: #999;
  font-size: 12px;
}

@media (max-width: 480px) {
  .login-card {
    width: 90%;
    padding: 32px 24px 28px;
  }
}
</style>
