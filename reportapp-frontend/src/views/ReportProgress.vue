<template>
  <div class="report-progress" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">报告进度总表</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openCreateModal"><el-icon><Plus /></el-icon>新增报告</el-button>
        <el-button @click="loadReports"><el-icon><Refresh /></el-icon>刷新</el-button>
      </div>
    </div>

    <div class="search-filter">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-input v-model="searchQuery" placeholder="搜索报告名称..." prefix-icon="Search" @input="handleSearch" />
        </el-col>
        <el-col :span="8">
          <el-select v-model="filterStatus" placeholder="所有状态" @change="handleFilter">
            <el-option label="所有状态" value="" />
            <el-option label="编制中" value="draft" />
            <el-option label="待审核" value="pending" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已通过" value="approved" />
            <el-option label="已退回" value="rejected" />
            <el-option label="已出版" value="published" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleFilter"><el-icon><Filter /></el-icon>筛选</el-button>
        </el-col>
      </el-row>
    </div>

    <div class="progress-overview">
      <el-row :gutter="20">
        <el-col :span="4"><el-card class="overview-card"><div class="overview-content"><div class="overview-value">{{ total }}</div><div class="overview-label">总报告</div></div></el-card></el-col>
        <el-col :span="4"><el-card class="overview-card"><div class="overview-content"><div class="overview-value">{{ draftReports }}</div><div class="overview-label">编制中</div></div></el-card></el-col>
        <el-col :span="4"><el-card class="overview-card"><div class="overview-content"><div class="overview-value">{{ pendingReports }}</div><div class="overview-label">待审核</div></div></el-card></el-col>
        <el-col :span="4"><el-card class="overview-card"><div class="overview-content"><div class="overview-value">{{ reviewingReports }}</div><div class="overview-label">审核中</div></div></el-card></el-col>
        <el-col :span="4"><el-card class="overview-card"><div class="overview-content"><div class="overview-value">{{ approvedReports }}</div><div class="overview-label">已通过</div></div></el-card></el-col>
        <el-col :span="4"><el-card class="overview-card"><div class="overview-content"><div class="overview-value">{{ publishedReports }}</div><div class="overview-label">已出版</div></div></el-card></el-col>
      </el-row>
    </div>

    <div class="progress-list">
      <el-card>
        <el-table :data="reports" style="width: 100%">
          <el-table-column prop="name" label="报告名称" min-width="180" />
          <el-table-column prop="code" label="报告编号" width="140" />
          <el-table-column prop="type" label="报告类型" width="140">
            <template #default="scope"><el-tag :type="getTagType(scope.row.type)">{{ getTypeName(scope.row.type) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="creator_name" label="编制人" width="100" />
          <el-table-column prop="created_at" label="创建时间" width="140" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="scope"><el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="进度" min-width="150">
            <template #default="scope">
              <el-progress :percentage="getProgress(scope.row)" :color="getProgressColor(getProgress(scope.row))" :status="getProgress(scope.row) >= 100 ? 'success' : ''" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="scope">
              <el-button size="small" @click="viewReport(scope.row)"><el-icon><View /></el-icon>查看</el-button>
              <el-button size="small" type="primary" @click="editReport(scope.row)" :disabled="scope.row.status !== 'draft' && scope.row.status !== 'revise'"><el-icon><Edit /></el-icon>编辑</el-button>
              <el-button size="small" type="danger" @click="deleteReport(scope.row)" :disabled="!isAdmin && scope.row.status !== 'draft'"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" :total="total" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>

    <!-- 新增报告弹窗 -->
    <el-dialog v-model="createModalVisible" title="新增报告" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="报告名称" required>
          <el-input v-model="createForm.name" placeholder="请输入报告名称" />
        </el-form-item>
        <el-form-item label="报告类型" required>
          <el-select v-model="createForm.type" placeholder="请选择报告类型" style="width: 100%" @change="loadFramesByType">
            <el-option label="船舶勘验报告" value="ship" />
            <el-option label="水土保持监测报告" value="water" />
            <el-option label="港口工程报告" value="port" />
            <el-option label="海洋环境影响评价报告" value="ocean" />
            <el-option label="航道通航条件影响评价报告" value="channel" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择框架">
          <el-select v-model="createForm.frame_id" placeholder="请选择框架模板（可选）" style="width: 100%" clearable>
            <el-option v-for="f in availableFrames" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.description" type="textarea" rows="2" placeholder="备注信息（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Refresh, Search, Filter, View, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getReports, createReport, deleteReport as apiDeleteReport } from '../api/reports'
import { getFrames } from '../api/frames'

const router = useRouter()
const loading = ref(false)
const reports = ref<any[]>([])
const total = ref(0)
const searchQuery = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const currentUser = computed(() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})
const isAdmin = computed(() => currentUser.value.role === 'admin')

const createModalVisible = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', type: 'ship', frame_id: '', description: '' })
const availableFrames = ref<any[]>([])

const draftReports = computed(() => reports.value.filter(r => r.status === 'draft').length)
const pendingReports = computed(() => reports.value.filter(r => r.status === 'pending').length)
const reviewingReports = computed(() => reports.value.filter(r => r.status === 'reviewing').length)
const approvedReports = computed(() => reports.value.filter(r => r.status === 'approved').length)
const publishedReports = computed(() => reports.value.filter(r => r.status === 'published' || r.status === 'archived').length)

const getTypeName = (type: string) => ({
  ship: '船舶勘验报告', water: '水土保持监测报告', port: '港口工程报告', ocean: '海洋环境影响评价报告', channel: '航道通航条件影响评价报告'
}[type] || type)

const getTagType = (type: string) => ({ ship: 'primary', water: 'success', port: 'warning', ocean: 'info', channel: 'danger' }[type] || 'default')
const getStatusType = (status: string) => ({ draft: 'info', pending: 'warning', reviewing: 'primary', approved: 'success', rejected: 'danger', published: 'success', archived: 'info' }[status] || 'default')
const getStatusText = (status: string) => ({ draft: '编制中', pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '已退回', published: '已出版', archived: '已归档', revise: '修订中' }[status] || '未知')
const getProgress = (report: any) => report.progress || ({ draft: 25, pending: 50, reviewing: 75, approved: 100, rejected: 50, published: 100, archived: 100 }[report.status] || 0)
const getProgressColor = (progress: number) => { if (progress < 30) return '#f56c6c'; if (progress < 70) return '#e6a23c'; return '#67c23a' }

const loadReports = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: pageSize.value }
    if (searchQuery.value) params.search = searchQuery.value
    if (filterStatus.value) params.status = filterStatus.value
    const res: any = await getReports(params)
    reports.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {} finally { loading.value = false }
}

const loadFramesByType = async () => {
  try {
    const res: any = await getFrames({ type: createForm.value.type, pageSize: 50 })
    availableFrames.value = res.data?.list || []
  } catch (e) { availableFrames.value = [] }
}

const openCreateModal = () => {
  createForm.value = { name: '', type: 'ship', frame_id: '', description: '' }
  loadFramesByType()
  createModalVisible.value = true
}

const submitCreate = async () => {
  if (!createForm.value.name) { ElMessage.warning('请输入报告名称'); return }
  if (!createForm.value.type) { ElMessage.warning('请选择报告类型'); return }
  creating.value = true
  try {
    const res: any = await createReport({
      name: createForm.value.name,
      type: createForm.value.type,
      frame_id: createForm.value.frame_id || null
    })
    ElMessage.success('报告创建成功')
    createModalVisible.value = false
    router.push({ path: '/report-edit', query: { id: String(res.data.id) } })
  } catch (e) {} finally { creating.value = false }
}

const viewReport = (report: any) => { router.push({ path: '/report-edit', query: { id: String(report.id), mode: 'view' } }) }
const editReport = (report: any) => { router.push({ path: '/report-edit', query: { id: String(report.id) } }) }

const deleteReport = (report: any) => {
  if (!report || !report.id) {
    ElMessage.error('报告信息无效')
    return
  }
  ElMessageBox.confirm(`确定要删除报告"${report.name}"吗？删除后无法恢复。`, '删除确认', { type: 'warning' })
    .then(async () => {
      try {
        await apiDeleteReport(report.id)
        ElMessage.success('报告已删除')
        loadReports()
      } catch (e: any) {
        console.error('Delete error:', e)
        ElMessage.error(e.message || '删除失败')
      }
    }).catch(() => {})
}

const handleSearch = () => { currentPage.value = 1; loadReports() }
const handleFilter = () => { currentPage.value = 1; loadReports() }
const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1; loadReports() }
const handleCurrentChange = (p: number) => { currentPage.value = p; loadReports() }

onMounted(() => { loadReports() })
</script>

<style scoped lang="scss">
.report-progress { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-actions { display: flex; gap: 12px; }
.search-filter { margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.progress-overview { margin-bottom: 24px; }
.overview-card { transition: all 0.3s; &:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(10,61,98,0.15); } }
.overview-content { text-align: center; .overview-value { font-size: 24px; font-weight: 600; color: #0A3D62; margin-bottom: 4px; } .overview-label { font-size: 14px; color: #666; } }
.progress-list { margin-bottom: 24px; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.action-buttons { display: flex; gap: 8px; }
</style>