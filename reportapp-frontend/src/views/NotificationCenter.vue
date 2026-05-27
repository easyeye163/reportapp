<template>
  <div class="notification-center" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">通知中心</h2>
      <div class="header-actions">
        <el-button @click="markAllRead" :disabled="unreadCount === 0"><el-icon><Check /></el-icon>全部已读</el-button>
        <el-button type="primary" @click="loadNotifications"><el-icon><Refresh /></el-icon>刷新</el-button>
      </div>
    </div>

    <div class="notification-tabs">
      <el-radio-group v-model="activeFilter" @change="loadNotifications">
        <el-radio-button label="all">全部通知</el-radio-button>
        <el-radio-button label="unread">未读</el-radio-button>
        <el-radio-button label="read">已读</el-radio-button>
      </el-radio-group>
      <span class="unread-badge" v-if="unreadCount > 0">{{ unreadCount }} 条未读</span>
    </div>

    <div class="notification-list">
      <el-card>
        <div v-if="notifications.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Bell /></el-icon>
          <p class="empty-text">暂无通知</p>
        </div>
        <div v-else class="notification-items">
          <div v-for="notification in notifications" :key="notification.id" class="notification-item" :class="{ 'unread': !notification.is_read }">
            <div class="notification-icon">
              <el-icon :class="notification.type === 'report' ? 'text-primary' : notification.type === 'review' ? 'text-success' : 'text-warning'">
                <component :is="getIcon(notification.type)" />
              </el-icon>
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-time">{{ notification.created_at }}</div>
            </div>
            <div class="notification-actions">
              <el-button size="small" @click="viewNotification(notification)" v-if="notification.link"><el-icon><View /></el-icon>查看</el-button>
              <el-button size="small" @click="markRead(notification)" v-if="!notification.is_read"><el-icon><Check /></el-icon>标记已读</el-button>
              <el-button size="small" type="danger" @click="deleteNotificationAction(notification)"><el-icon><Delete /></el-icon></el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="pagination" v-if="total > pageSize">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" layout="total, prev, pager, next" :total="total" @current-change="loadNotifications" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Check, Refresh, View, Delete, Document, CircleCheck, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api/notifications'

const router = useRouter()
const loading = ref(false)
const notifications = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const activeFilter = ref('all')

const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

const getIcon = (type: string) => {
  const icons = { report: Document, review: CircleCheck, system: Warning }
  return icons[type] || Bell
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const filter = activeFilter.value === 'all' ? 'all' : activeFilter.value === 'unread' ? 'unread' : 'read'
    const res: any = await getNotifications({ page: currentPage.value, pageSize: pageSize.value, filter })
    notifications.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {} finally { loading.value = false }
}

const viewNotification = (notification: any) => {
  if (!notification.is_read) markRead(notification)
  if (notification.link) router.push(notification.link)
}

const markRead = async (notification: any) => {
  try {
    await markNotificationRead(notification.id)
    notification.is_read = 1
    ElMessage.success('已标记为已读')
  } catch (e) {}
}

const markAllRead = async () => {
  ElMessageBox.confirm('确定将所有通知标记为已读吗？', '确认', { type: 'info' })
    .then(async () => {
      try {
        await markAllNotificationsRead()
        notifications.value.forEach(n => n.is_read = 1)
        ElMessage.success('已全部标记为已读')
      } catch (e) {}
    }).catch(() => {})
}

const deleteNotificationAction = (notification: any) => {
  ElMessageBox.confirm('确定删除此通知吗？', '删除确认', { type: 'warning' })
    .then(async () => {
      try {
        await deleteNotification(notification.id)
        notifications.value = notifications.value.filter(n => n.id !== notification.id)
        ElMessage.success('通知已删除')
      } catch (e) {}
    }).catch(() => {})
}

onMounted(() => { loadNotifications() })
</script>

<style scoped lang="scss">
.notification-center { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-actions { display: flex; gap: 12px; }
.notification-tabs { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.unread-badge { font-size: 14px; color: #e6a23c; font-weight: 500; }
.notification-list { margin-bottom: 24px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; .empty-icon { font-size: 48px; color: #c0c4cc; margin-bottom: 16px; } .empty-text { font-size: 14px; color: #909399; } }
.notification-items { display: flex; flex-direction: column; }
.notification-item { display: flex; align-items: flex-start; padding: 16px; border-bottom: 1px solid #e4e7ed; transition: all 0.3s ease;
  &:last-child { border-bottom: none; }
  &:hover { background: #f5f7fa; }
  &.unread { background: #fdf6ec; .notification-title { font-weight: 600; } }
}
.notification-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f0f2f5; margin-right: 16px; }
.notification-content { flex: 1; min-width: 0; }
.notification-title { font-size: 15px; color: #303133; margin-bottom: 4px; }
.notification-message { font-size: 13px; color: #606266; margin-bottom: 8px; line-height: 1.5; }
.notification-time { font-size: 12px; color: #909399; }
.notification-actions { display: flex; gap: 8px; flex-shrink: 0; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.text-primary { color: #409eff; }
.text-success { color: #67c23a; }
.text-warning { color: #e6a23c; }
</style>