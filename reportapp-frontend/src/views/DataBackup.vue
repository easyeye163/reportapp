<template>
  <div class="data-backup" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">数据备份</h2>
      <el-button type="primary" @click="createBackup" :loading="creating"><el-icon><RefreshLeft /></el-icon>立即备份</el-button>
    </div>

    <!-- 备份状态 -->
    <div class="backup-status">
      <el-card>
        <div class="status-content">
          <div class="status-item">
            <el-icon class="text-2xl text-success"><CircleCheck /></el-icon>
            <div class="status-info">
              <div class="status-title">上次备份</div>
              <div class="status-value">{{ backupSettings.lastBackup || '暂无备份' }}</div>
            </div>
          </div>
          <div class="status-item">
            <el-icon class="text-2xl text-info"><Clock /></el-icon>
            <div class="status-info">
              <div class="status-title">备份频率</div>
              <div class="status-value">{{ backupSettings.frequency === 'daily' ? '每日自动备份' : backupSettings.frequency === 'weekly' ? '每周自动备份' : '每月自动备份' }}</div>
            </div>
          </div>
          <div class="status-item">
            <el-icon class="text-2xl text-warning"><Cpu /></el-icon>
            <div class="status-info">
              <div class="status-title">备份存储</div>
              <div class="status-value">云端存储 + 本地备份</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 备份历史 -->
    <div class="backup-history">
      <h3 class="text-lg font-semibold text-dark mb-4">备份历史</h3>
      <el-card>
        <el-table :data="backups" style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="backupDate" label="备份时间" width="180" />
          <el-table-column prop="type" label="备份类型" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'auto' ? 'info' : 'primary'">{{ scope.row.type === 'auto' ? '自动' : '手动' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="备份大小" width="100" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">{{ scope.row.status === 'success' ? '成功' : '失败' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="scope">
              <div class="action-buttons">
                <el-button size="small" @click="downloadBackup(scope.row)" class="action-button"><el-icon><Download /></el-icon><span class="button-text">下载</span></el-button>
                <el-button size="small" @click="restoreBackup(scope.row)" class="action-button"><el-icon><RefreshRight /></el-icon><span class="button-text">恢复</span></el-button>
                <el-button size="small" type="danger" @click="deleteBackup(scope.row)" class="action-button"><el-icon><Delete /></el-icon><span class="button-text">删除</span></el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 备份设置 -->
    <div class="backup-settings">
      <h3 class="text-lg font-semibold text-dark mb-4">备份设置</h3>
      <el-card>
        <el-form :model="backupSettings" label-width="120px">
          <el-form-item label="自动备份">
            <el-switch v-model="backupSettings.autoBackup" />
          </el-form-item>
          <el-form-item label="备份频率">
            <el-select v-model="backupSettings.frequency" placeholder="选择备份频率">
              <el-option label="每日" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </el-form-item>
          <el-form-item label="备份时间">
            <el-time-picker v-model="backupSettings.backupTime" format="HH:mm" placeholder="选择备份时间" style="width: 100%" />
          </el-form-item>
          <el-form-item label="备份存储">
            <el-checkbox-group v-model="backupSettings.storage">
              <el-checkbox label="local">本地存储</el-checkbox>
              <el-checkbox label="cloud">云端存储</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveSettings" :loading="savingSettings">保存设置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshLeft, CircleCheck, Clock, Cpu, Download, RefreshRight, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBackups, createBackup as apiCreateBackup, getBackupSettings, updateBackupSettings, downloadBackup as apiDownloadBackup, restoreBackup as apiRestoreBackup, deleteBackup as apiDeleteBackup } from '../api/backups'

const loading = ref(false)
const creating = ref(false)
const savingSettings = ref(false)
const backups = ref<any[]>([])
const backupSettings = ref({
  autoBackup: true,
  frequency: 'daily',
  backupTime: new Date(),
  storage: ['local', 'cloud'],
  lastBackup: ''
})

const loadBackups = async () => {
  loading.value = true
  try {
    const res: any = await getBackups()
    backups.value = res.data?.list || res.data || []
  } catch (e) {} finally { loading.value = false }
}

const loadSettings = async () => {
  try {
    const res: any = await getBackupSettings()
    if (res.data) Object.assign(backupSettings.value, res.data)
  } catch (e) {}
}

const createBackupAction = async () => {
  creating.value = true
  try {
    await apiCreateBackup()
    ElMessage.success('备份创建成功')
    loadBackups()
  } catch (e) {} finally { creating.value = false }
}

const downloadBackup = async (backup: any) => {
  try {
    const res: any = await apiDownloadBackup(backup.id)
    const blob = new Blob([res], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup-${backup.id}.zip`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('备份下载成功')
  } catch (e) {}
}

const restoreBackup = (backup: any) => {
  ElMessageBox.confirm('确定要从该备份恢复数据吗？这将覆盖当前数据。', '恢复确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    .then(async () => {
      try {
        await apiRestoreBackup(backup.id)
        ElMessage.success('数据恢复成功，请重启服务以生效')
      } catch (e) {}
    }).catch(() => {})
}

const deleteBackup = (backup: any) => {
  ElMessageBox.confirm('确定要删除此备份吗？', '删除确认', { type: 'warning' })
    .then(async () => { try { await apiDeleteBackup(backup.id); ElMessage.success('备份已删除'); loadBackups() } catch (e) {} }).catch(() => {})
}

const saveSettings = async () => {
  savingSettings.value = true
  try {
    await updateBackupSettings(backupSettings.value)
    ElMessage.success('设置保存成功')
  } catch (e) {} finally { savingSettings.value = false }
}

onMounted(() => { loadBackups(); loadSettings() })
</script>

<style scoped lang="scss">
.data-backup { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.backup-status { margin-bottom: 24px; }
.status-content { display: flex; gap: 24px; flex-wrap: wrap;
  .status-item { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 250px; padding: 16px; background: #f8f9fa; border-radius: 8px;
    .status-info { .status-title { font-size: 14px; color: #666; } .status-value { font-size: 16px; font-weight: 500; color: #333; } }
  }
}
.backup-history { margin-bottom: 24px; }
.backup-settings { margin-bottom: 24px; }
.action-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; width: 100%; }
.action-button { flex: 1; min-width: 60px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; }
.button-text { font-size: 12px; }
</style>
