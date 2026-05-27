<template>
  <div class="report-edit">
    <div class="report-header">
      <div class="header-info">
        <div class="report-title-section">
          <el-input v-model="reportInfo.name" class="report-title-input" placeholder="请输入报告名称" @blur="saveName" />
          <div class="report-id-section">
            <span class="id-label">报告编号：</span>
            <el-input v-model="reportInfo.code" class="report-id-input" :disabled="true" />
          </div>
        </div>
        <div class="report-meta">
          <span class="meta-item">类型：<el-tag>{{ getTypeName(reportInfo.type) }}</el-tag></span>
          <span class="meta-divider">|</span>
          <span class="meta-item">状态：<el-tag :type="getStatusType(reportInfo.status)">{{ getStatusText(reportInfo.status) }}</el-tag></span>
          <span class="meta-divider">|</span>
          <span class="meta-item">
            <span class="team-label">团队：</span>
            <el-tag v-for="member in reportInfo.teamMembers" :key="member.id" size="small" class="team-member-tag">{{ member.name }}</el-tag>
            <el-button type="primary" plain size="small" @click="openTeamModal" class="invite-button"><el-icon><Plus /></el-icon>邀请</el-button>
          </span>
        </div>
      </div>
      <div class="header-actions">
        <el-tag v-if="editorStatus === 'online'" type="success" size="small"><el-icon><CircleCheck /></el-icon>编辑器就绪</el-tag>
        <el-tag v-else-if="editorStatus === 'offline'" type="danger" size="small"><el-icon><Warning /></el-icon>编辑器离线</el-tag>
        <el-button type="primary" class="action-button" @click="openSubmitModal" :disabled="reportInfo.status !== 'draft' && reportInfo.status !== 'revise'"><el-icon><Promotion /></el-icon>提交审核</el-button>
      </div>
    </div>

    <!-- 文档编辑器主体 -->
    <div class="editor-body">
      <OnlyOfficeEmbed
        v-if="reportInfo.id"
        :key="reportInfo.id"
        :report-id="reportInfo.id"
        @ready="onEditorReady"
        @error="onEditorError"
        @status-change="onStatusChange"
      />
      <div v-else class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <h4>请先创建报告</h4>
      </div>
    </div>

    <!-- 团队管理弹窗 -->
    <el-dialog v-model="teamModalVisible" title="管理团队成员" width="500px">
      <el-form label-width="100px">
        <el-form-item label="邀请成员">
          <el-select v-model="teamForm.selectedMembers" multiple placeholder="请选择成员" style="width:100%">
            <el-option v-for="u in allUsers" :key="u.id" :label="u.name" :value="String(u.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="现有成员">
          <div class="existing-members">
            <el-tag v-for="member in reportInfo.teamMembers" :key="member.id" class="existing-member-tag">
              {{ member.name }}
              <el-button size="small" type="danger" @click="removeMember(member.id)" style="margin-left:4px;padding:2px"><el-icon><Delete /></el-icon></el-button>
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teamModalVisible = false">取消</el-button>
        <el-button type="primary" @click="addMembers">确定</el-button>
      </template>
    </el-dialog>

    <!-- 提交审核弹窗 -->
    <el-dialog v-model="submitModalVisible" title="提交审核" width="500px">
      <el-form label-width="100px">
        <el-form-item label="提交说明">
          <el-input v-model="submitForm.description" type="textarea" rows="3" placeholder="请输入提交说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Delete, Document, Promotion, CircleCheck, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getReport, updateReport, submitReport, updateTeam } from '../api/reports'
import { getUsers } from '../api/users'
import OnlyOfficeEmbed from '../components/OnlyOfficeEmbed.vue'

const route = useRoute()
const router = useRouter()
const submitting = ref(false)
const allUsers = ref<any[]>([])
const editorStatus = ref<'checking' | 'online' | 'offline'>('checking')

const reportInfo = ref<any>({ id: 0, name: '', code: '', type: 'ship', status: 'draft', teamMembers: [] })

const submitModalVisible = ref(false)
const submitForm = ref({ description: '' })
const teamModalVisible = ref(false)
const teamForm = ref({ selectedMembers: [] as string[] })

const TYPE_NAMES: Record<string, string> = {
  ship: '船舶勘验报告', water: '水土保持监测报告', port: '港口工程报告',
  ocean: '海洋环境影响评价报告', channel: '航道通航条件影响评价报告'
}
const getTypeName = (type: string) => TYPE_NAMES[type] || type
const getStatusType = (status: string) => ({
  draft: 'info', pending: 'warning', reviewing: 'warning',
  approved: 'success', rejected: 'danger', revise: 'warning'
}[status] || 'info')
const getStatusText = (status: string) => ({
  draft: '编制中', pending: '待审核', reviewing: '审核中',
  approved: '已通过', rejected: '已退回', revise: '修订中', published: '已出版', archived: '已归档'
}[status] || status)

const loadReport = async () => {
  const reportId = route.query.id
  if (!reportId) return
  try {
    const res: any = await getReport(Number(reportId))
    const r = res.data
    reportInfo.value = {
      id: r.id, name: r.name, code: r.code, type: r.type,
      status: r.status, teamMembers: r.members || []
    }
  } catch (e) {
    console.error('Load report error:', e)
  }
}

const loadUsers = async () => {
  try {
    const res: any = await getUsers({ page: 1, pageSize: 100 })
    allUsers.value = res.data?.list || []
  } catch {}
}

const saveName = async () => {
  if (!reportInfo.value.id || !reportInfo.value.name) return
  try {
    await updateReport(reportInfo.value.id, { name: reportInfo.value.name })
  } catch {}
}

const onEditorReady = () => {
  console.log('Editor ready')
}

const onEditorError = (msg: string) => {
  ElMessage.error(msg)
}

const onStatusChange = (s: string) => {
  editorStatus.value = s as any
}

const openSubmitModal = () => {
  submitForm.value = { description: '' }
  submitModalVisible.value = true
}

const submitReview = async () => {
  submitting.value = true
  try {
    await submitReport(reportInfo.value.id, submitForm.value)
    ElMessage.success('报告已提交审核')
    submitModalVisible.value = false
    reportInfo.value.status = 'pending'
  } catch {} finally { submitting.value = false }
}

const openTeamModal = () => { teamForm.value.selectedMembers = []; teamModalVisible.value = true }

const addMembers = async () => {
  if (teamForm.value.selectedMembers.length === 0) {
    ElMessage.warning('请选择要邀请的成员')
    return
  }
  try {
    await updateTeam(reportInfo.value.id, { memberIds: teamForm.value.selectedMembers.map(Number) })
    ElMessage.success('成员添加成功')
    teamModalVisible.value = false
    loadReport()
  } catch {}
}

const removeMember = async (memberId: number) => {
  try {
    await updateTeam(reportInfo.value.id, { removeMemberId: memberId })
    ElMessage.success('成员已移除')
    loadReport()
  } catch {}
}

watch(() => route.query.id, (newId, oldId) => {
  if (newId && String(newId) !== String(oldId)) {
    loadReport()
  }
})

onMounted(() => {
  if (route.query.id) loadReport()
  loadUsers()
})
</script>

<style scoped lang="scss">
.report-edit {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.header-info { flex: 1; }
.report-title-section { margin-bottom: 6px; }
.report-title-input {
  font-size: 17px;
  font-weight: 600;
  :deep(.el-input__wrapper) { box-shadow: none !important; border-bottom: 1px solid #dcdfe6; border-radius: 0; }
}
.report-id-section { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.id-label { font-size: 13px; color: #909399; }
.report-id-input { width: 150px; font-size: 13px; }
.report-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #606266; margin-top: 4px; }
.meta-divider { color: #dcdfe6; }
.team-member-tag { margin-right: 4px; }
.invite-button { margin-left: 8px; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.action-button { padding: 8px 16px; }

.editor-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: white;
}
.empty-icon { font-size: 48px; color: #c0c4cc; margin-bottom: 16px; }

.existing-members { display: flex; flex-wrap: wrap; gap: 8px; }
.existing-member-tag { display: flex; align-items: center; gap: 4px; }
</style>
