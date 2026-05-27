<template>
  <div class="report-export" v-loading="loading">
    <div class="page-header"><h2 class="text-2xl font-bold text-dark">报告出版</h2></div>

    <div class="search-filter">
      <el-row :gutter="20">
        <el-col :span="8"><el-input v-model="filterForm.name" placeholder="报告名称" prefix-icon="Search" /></el-col>
        <el-col :span="4"><el-input v-model="filterForm.id" placeholder="报告编号" prefix-icon="Document" /></el-col>
        <el-col :span="8"><el-input v-model="filterForm.teamMember" placeholder="团队成员" prefix-icon="User" /></el-col>
        <el-col :span="4"><el-button type="primary" @click="loadReports"><el-icon><Filter /></el-icon>筛选</el-button></el-col>
      </el-row>
    </div>

    <div class="report-list">
      <el-card>
        <el-table :data="reports" style="width: 100%">
          <el-table-column prop="name" label="报告名称" min-width="200" />
          <el-table-column prop="code" label="报告编号" width="150" />
          <el-table-column prop="creator" label="编制者" width="120" />
          <el-table-column prop="typeName" label="报告类型" width="150">
            <template #default="scope"><el-tag :type="getTagType(scope.row.type)">{{ scope.row.typeName }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="createDate" label="创建时间" width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope"><el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="预览" width="80">
            <template #default="scope">
              <el-button size="small" @click="previewReport(scope.row)" class="action-button"><el-icon><View /></el-icon><span class="button-text">预览</span></el-button>
            </template>
          </el-table-column>
          <el-table-column label="撤回" width="80">
            <template #default="scope">
              <el-button size="small" type="danger" @click="withdrawReport(scope.row)" class="action-button"><el-icon><ArrowLeft /></el-icon><span class="button-text">撤回</span></el-button>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="exportReport(scope.row)" class="action-button"><el-icon><Download /></el-icon><span class="button-text">导出</span></el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" :total="total" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>

    <el-dialog v-model="exportModalVisible" title="导出设置" width="500px">
      <el-form :model="exportForm" label-width="100px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="docx">DOCX</el-radio><el-radio label="pdf">PDF</el-radio> <el-radio label="html">HTML</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="报告水印">
          <el-switch v-model="exportForm.watermark" />
          <el-input v-if="exportForm.watermark" v-model="exportForm.watermarkText" placeholder="输入水印文本" class="mt-2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportModalVisible = false">取消</el-button>
          <el-button type="primary" :loading="exporting" @click="confirmExport">确认导出</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="previewModalVisible" title="报告预览" width="800px" fullscreen>
      <div class="preview-content">
        <h3 class="preview-title">{{ previewReportData.name }}</h3>
        <div class="preview-meta">
          <span>报告编号：{{ previewReportData.id }}</span>
          <span>编制者：{{ previewReportData.creator }}</span>
          <span>创建时间：{{ previewReportData.createDate }}</span>
        </div>
        <div class="preview-body">
          <el-button type="primary" @click="router.push({ path: '/report-edit', query: { id: currentPreviewId, mode: 'view' } })">
            <el-icon><View /></el-icon>查看完整报告
          </el-button>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer"><el-button @click="previewModalVisible = false">关闭</el-button></span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Download, ArrowLeft, View, Filter } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getReports, getReport, exportReport as apiExportReport, withdrawReport as apiWithdrawReport } from '../api/reports'

const router = useRouter()

const loading = ref(false)
const exporting = ref(false)
const reports = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterForm = ref({ name: '', id: '', teamMember: '' })
const exportModalVisible = ref(false)
const currentExportReport = ref<any>(null)
const exportForm = ref({ format: 'docx', path: 'local', watermark: false, watermarkText: '福建港航船舶报告' })
const previewModalVisible = ref(false)
const currentPreviewId = ref(0)
const previewReportData = ref({ name: '', id: '', creator: '', createDate: '' })

const getTagType = (type: string) => ({ ship: 'primary', water: 'success', port: 'warning', ocean: 'info', channel: 'danger' }[type] || 'default')
const getStatusType = (status: string) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[status] || 'default')
const getStatusText = (status: string) => ({ pending: '待审核', approved: '已通过', rejected: '已退回' }[status] || '未知')

const loadReports = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: pageSize.value, status: 'approved' }
    if (filterForm.value.name) params.search = filterForm.value.name
    const res: any = await getReports(params)
    reports.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {} finally { loading.value = false }
}

const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1; loadReports() }
const handleCurrentChange = (p: number) => { currentPage.value = p; loadReports() }

const previewReport = async (report: any) => {
  currentPreviewId.value = report.id
  previewReportData.value = { name: report.name, id: report.code || report.id, creator: report.creator, createDate: report.createDate }
  previewModalVisible.value = true
}

const withdrawReport = async (report: any) => {
  try { await apiWithdrawReport(report.id); ElMessage.success('报告已撤回'); loadReports() } catch (e) {}
}

const exportReport = (report: any) => { currentExportReport.value = report; exportModalVisible.value = true }

const confirmExport = async () => {
  if (!currentExportReport.value) return
  exporting.value = true
  try {
    const params = {
      format: exportForm.value.format,
      watermark: exportForm.value.watermark ? 'true' : 'false',
      watermarkText: exportForm.value.watermarkText
    }
    const res: any = await apiExportReport(currentExportReport.value.id, params)
    
    if (exportForm.value.format === 'json') {
      const blob = new Blob([JSON.stringify(res.data)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentExportReport.value.code || currentExportReport.value.name}.json`
      link.click()
      window.URL.revokeObjectURL(url)
    } else {
      const blob = new Blob([res], { 
        type: exportForm.value.format === 'pdf' 
          ? 'application/pdf' 
          : exportForm.value.format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'text/html'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentExportReport.value.code || currentExportReport.value.name}.${exportForm.value.format}`
      link.click()
      window.URL.revokeObjectURL(url)
    }
    
    ElMessage.success('报告导出成功')
    exportModalVisible.value = false
  } catch (e) {} finally { exporting.value = false }
}

onMounted(() => { loadReports() })
</script>

<style scoped lang="scss">
.report-export { padding: 24px; }
.page-header { margin-bottom: 24px; }
.search-filter { margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); }
.report-list { margin-bottom: 24px; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.action-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; width: 100%; }
.action-button { flex: 1; min-width: 60px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; }
.button-text { font-size: 12px; }
.preview-content { padding: 20px; }
.preview-title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 16px; text-align: center; }
.preview-meta { display: flex; gap: 20px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #666; }
.preview-body { line-height: 1.6; color: #333; }
.mt-2 { margin-top: 8px; }
</style>
