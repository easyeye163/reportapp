<template>
  <div class="user-center" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">用户中心</h2>
    </div>

    <div class="user-profile">
      <el-card>
        <div class="profile-header">
          <div class="avatar-section">
            <el-avatar :size="80" :src="userInfo.avatar">
              <el-icon class="avatar-icon"><User /></el-icon>
            </el-avatar>
            <el-button size="small" class="change-avatar-btn" @click="changeAvatar"><el-icon><Edit /></el-icon>更换头像</el-button>
          </div>
          <div class="user-info-section">
            <div class="user-name">{{ userInfo.name }}</div>
            <el-tag :type="getRoleType(userInfo.role)" size="large">{{ getRoleText(userInfo.role) }}</el-tag>
            <div class="user-meta">
              <span class="meta-item"><el-icon><Phone /></el-icon>{{ userInfo.phone }}</span>
              <span class="meta-item"><el-icon><Calendar /></el-icon>注册时间：{{ userInfo.createDate }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="profile-tabs">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-card>
            <el-form :model="userInfo" label-width="100px">
              <el-form-item label="用户名"><el-input v-model="userInfo.name" /></el-form-item>
              <el-form-item label="手机号"><el-input v-model="userInfo.phone" /></el-form-item>
              <el-form-item label="邮箱"><el-input v-model="userInfo.email" placeholder="请输入邮箱" /></el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveBasicInfo" :loading="saving">保存修改</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="修改密码" name="password">
          <el-card>
            <el-form :model="passwordForm" label-width="100px">
              <el-form-item label="当前密码"><el-input v-model="passwordForm.oldPassword" type="password" show-password /></el-form-item>
              <el-form-item label="新密码"><el-input v-model="passwordForm.newPassword" type="password" show-password /></el-form-item>
              <el-form-item label="确认密码"><el-input v-model="passwordForm.confirmPassword" type="password" show-password /></el-form-item>
              <el-form-item>
                <el-button type="primary" @click="changePassword" :loading="changingPassword">修改密码</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="我的报告" name="reports">
          <el-card>
            <el-table :data="myReports" style="width: 100%">
              <el-table-column prop="name" label="报告名称" min-width="180" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createDate" label="创建时间" width="150" />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button size="small" @click="viewReport(scope.row)"><el-icon><View /></el-icon>查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="操作记录" name="logs">
          <el-card>
            <el-table :data="operationLogs" style="width: 100%">
              <el-table-column prop="action" label="操作" width="150" />
              <el-table-column prop="target" label="对象" min-width="180" />
              <el-table-column prop="time" label="时间" width="180" />
              <el-table-column prop="ip" label="IP地址" width="120" />
            </el-table>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Edit, Phone, Calendar, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getReports } from '../api/reports'
import { getOperationLogs } from '../api/logs'
import { updateUser } from '../api/users'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)
const activeTab = ref('basic')

const currentUser = computed(() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})

const userInfo = ref({
  name: currentUser.value.name || '',
  phone: currentUser.value.phone || '',
  email: currentUser.value.email || '',
  role: currentUser.value.role || '',
  avatar: '',
  createDate: currentUser.value.created_at || currentUser.value.createDate || ''
})

const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const myReports = ref<any[]>([])
const operationLogs = ref<any[]>([])

const getRoleType = (role: string) => ({ admin: 'danger', engineer: 'primary', manager: 'warning', chief: 'success' }[role] || 'default')
const getRoleText = (role: string) => ({ admin: '管理员', engineer: '工程师', manager: '主管', chief: '总工程师' }[role] || '未知')
const getStatusType = (status: string) => ({ draft: 'info', pending: 'warning', reviewing: 'primary', approved: 'success', rejected: 'danger', published: 'success', archived: 'info' }[status] || 'default')
const getStatusText = (status: string) => ({ draft: '编制中', pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '已退回', published: '已出版', archived: '已归档' }[status] || status)

const loadMyReports = async () => {
  try {
    const res: any = await getReports({ creatorId: currentUser.value.id, pageSize: 10 })
    myReports.value = res.data?.list || []
  } catch (e) {}
}

const loadOperationLogs = async () => {
  try {
    const res: any = await getOperationLogs({ pageSize: 10 })
    operationLogs.value = res.data?.list?.map(log => ({
      action: log.action,
      target: log.target || '',
      time: log.created_at,
      ip: log.ip_address || ''
    })) || []
  } catch (e) {}
}

const changeAvatar = () => { ElMessage.info('更换头像功能开发中') }

const saveBasicInfo = async () => {
  saving.value = true
  try {
    await updateUser(currentUser.value.id, { name: userInfo.value.name, phone: userInfo.value.phone })
    const updatedUser = { ...currentUser.value, name: userInfo.value.name, phone: userInfo.value.phone }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    ElMessage.success('基本信息已更新')
  } catch (e) {} finally { saving.value = false }
}

const changePassword = async () => {
  if (!passwordForm.value.oldPassword || !passwordForm.value.newPassword) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  changingPassword.value = true
  try {
    await updateUser(currentUser.value.id, { password: passwordForm.value.newPassword })
    ElMessage.success('密码修改成功，请重新登录')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  } catch (e) {} finally { changingPassword.value = false }
}

const viewReport = (report: any) => { router.push({ path: '/report-edit', query: { id: report.id, mode: 'view' } }) }

onMounted(() => { loadMyReports(); loadOperationLogs() })
</script>

<style scoped lang="scss">
.user-center { padding: 24px; }
.page-header { margin-bottom: 24px; }
.user-profile { margin-bottom: 24px; }
.profile-header { display: flex; align-items: center; gap: 24px; padding: 24px; }
.avatar-section { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.avatar-icon { font-size: 32px; }
.change-avatar-btn { margin-top: 8px; }
.user-info-section { flex: 1; }
.user-name { font-size: 24px; font-weight: 600; color: #303133; margin-bottom: 12px; }
.user-meta { display: flex; gap: 24px; margin-top: 16px; font-size: 14px; color: #606266;
  .meta-item { display: flex; align-items: center; gap: 4px; }
}
.profile-tabs { .el-tabs { background: #fff; border-radius: 8px; padding: 16px; } }
</style>