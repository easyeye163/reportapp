<template>
  <div class="review-management" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">审核管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openLevelSettings"><el-icon><Setting /></el-icon>审核层级设置</el-button>
      </div>
    </div>

    <div class="status-tabs">
      <el-radio-group v-model="activeStatus" @change="loadReviews">
        <el-radio-button label="pending">待审核</el-radio-button>
        <el-radio-button label="approved">已通过</el-radio-button>
        <el-radio-button label="rejected">已退回</el-radio-button>
        <el-radio-button label="">全部</el-radio-button>
      </el-radio-group>
    </div>

    <div class="search-filter">
      <el-row :gutter="24" class="filter-row">
        <el-col :span="24">
          <el-input v-model="searchQuery" placeholder="搜索报告名称、编制者..." prefix-icon="Search" @input="loadReviews" />
        </el-col>
      </el-row>
    </div>

    <div class="report-list">
      <el-table :data="reviews" style="width: 100%">
        <el-table-column prop="reportName" label="报告名称" min-width="200">
          <template #default="scope">
            <div><div class="font-medium">{{ scope.row.reportName || scope.row.name }}</div></div>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="编制者" width="120" />
        <el-table-column prop="createDate" label="提交时间" width="150" />
        <el-table-column prop="result" label="审核结果" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.result === 'approved' ? 'success' : scope.row.result === 'rejected' ? 'danger' : 'warning'">
              {{ scope.row.result === 'approved' ? '已通过' : scope.row.result === 'rejected' ? '已退回' : '待审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button size="small" @click="viewReport(scope.row)" class="action-button"><el-icon><View /></el-icon><span class="button-text">查看</span></el-button>
              <el-button size="small" type="primary" @click="reviewReport(scope.row)" v-if="!scope.row.result" class="action-button"><el-icon><Check /></el-icon><span class="button-text">审核</span></el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" :total="total" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>

    <!-- 审核模态框 -->
    <el-dialog v-model="reviewModalVisible" title="审核报告" width="800px">
      <div v-if="currentReport">
        <div class="mb-4">
          <h4 class="font-medium text-dark">{{ currentReport.reportName || currentReport.name }}</h4>
          <p class="text-sm text-gray-500">编制者：{{ currentReport.creator }} | 提交时间：{{ currentReport.createDate }}</p>
        </div>
        <div class="mb-6">
          <h5 class="font-medium text-dark mb-3">审核意见</h5>
          <el-form :model="reviewForm" label-width="100px">
            <el-form-item label="审核意见">
              <el-input v-model="reviewForm.comment" type="textarea" rows="4" placeholder="请输入审核意见..." />
            </el-form-item>
            <el-form-item label="审核结果">
              <el-radio-group v-model="reviewForm.result">
                <el-radio label="approved">通过</el-radio>
                <el-radio label="rejected">退回</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reviewModalVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSignature"><el-icon><Edit /></el-icon>签名</el-button>
          <el-button type="primary" :loading="submitting" @click="submitReview">提交审核结果</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 审核层级设置模态框 -->
    <el-dialog v-model="levelSettingsVisible" title="审核层级设置" width="500px">
      <el-form :model="levelSettings" label-width="100px">
        <el-form-item label="审核层级">
          <el-select v-model="levelSettings.level" placeholder="请选择审核层级">
            <el-option label="三级审核" value="3" />
            <el-option label="四级审核" value="4" />
            <el-option label="五级审核" value="5" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="levelSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveLevelSettings">保存设置</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 签名模态框 -->
    <el-dialog v-model="signatureModalVisible" title="电子签名" width="400px">
      <div class="signature-container">
        <div class="signature-pad"></div>
        <div class="signature-actions">
          <el-button @click="signatureModalVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSignature">确认签名</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, View, Check, Edit, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getReviews, submitReview as apiSubmitReview, signReview, stampReview, getReviewLevels, updateReviewLevels } from '../api/reviews'

const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const reviews = ref<any[]>([])
const total = ref(0)
const activeStatus = ref('pending')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const reviewModalVisible = ref(false)
const currentReport = ref<any>(null)
const reviewForm = ref({ comment: '', result: 'approved' })
const levelSettingsVisible = ref(false)
const levelSettings = ref({ level: '3' })
const signatureModalVisible = ref(false)
const currentReportId = ref(0)

const loadReviews = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: pageSize.value }
    if (activeStatus.value) params.status = activeStatus.value
    if (searchQuery.value) params.search = searchQuery.value
    const res: any = await getReviews(params)
    reviews.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {} finally { loading.value = false }
}

const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1; loadReviews() }
const handleCurrentChange = (p: number) => { currentPage.value = p; loadReviews() }
const viewReport = (report: any) => { router.push({ path: '/report-edit', query: { id: report.reportId || report.id, mode: 'view' } }) }

const reviewReport = (report: any) => {
  currentReport.value = report
  currentReportId.value = report.reportId || report.id
  reviewForm.value = { comment: '', result: 'approved' }
  reviewModalVisible.value = true
}

const submitReviewAction = async () => {
  if (!reviewForm.value.comment) { ElMessage.warning('请输入审核意见'); return }
  submitting.value = true
  try {
    await apiSubmitReview(currentReportId.value, reviewForm.value)
    ElMessage.success('审核结果已提交')
    reviewModalVisible.value = false
    loadReviews()
  } catch (e) {} finally { submitting.value = false }
}

const submitReview = () => { submitReviewAction() }

const openLevelSettings = () => { levelSettingsVisible.value = true }
const saveLevelSettings = async () => {
  localStorage.setItem('defaultReviewLevel', levelSettings.value.level)
  ElMessage.success('审核层级设置已保存')
  levelSettingsVisible.value = false
}
const handleSignature = () => { signatureModalVisible.value = true }
const confirmSignature = async () => {
  try { await signReview(currentReportId.value); ElMessage.success('签名已确认'); signatureModalVisible.value = false } catch (e) {}
}

onMounted(() => { loadReviews() })
</script>

<style scoped lang="scss">
.review-management { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-actions { display: flex; gap: 12px; }
.status-tabs { margin-bottom: 24px; }
.search-filter { margin-top: 24px; margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); .filter-row { margin-bottom: 16px; align-items: center; } }
.report-list { margin-bottom: 24px; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); overflow: hidden; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.action-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; width: 100%; }
.action-button { flex: 1; min-width: 60px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; }
.button-text { font-size: 12px; }
.signature-container { padding: 20px; }
.signature-pad { width: 100%; height: 200px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; background: white; cursor: crosshair; }
.signature-actions { display: flex; justify-content: flex-end; gap: 12px; }
@media (max-width: 768px) { .page-header { flex-direction: column; align-items: flex-start; gap: 12px; } .signature-pad { height: 150px; } }
</style>
