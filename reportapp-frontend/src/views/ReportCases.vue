<template>
  <div class="report-cases-container" v-loading="loading">
    <div class="page-header">
      <h1>标准与报告案例库</h1>
      <div class="header-actions">
        <el-button type="primary" @click="handleUploadCase"><el-icon><Upload /></el-icon>上传文件</el-button>
      </div>
    </div>

    <div class="library-tabs">
      <el-tabs v-model="activeLibrary" @tab-click="loadData">
        <el-tab-pane label="报告案例库" name="cases">
          <div class="library-content">
            <div class="filter-section">
              <el-form :inline="true" :model="filterForm" class="filter-form">
                <el-form-item label="业务类型">
                  <el-select v-model="filterForm.businessType" placeholder="请选择业务类型" clearable @change="loadCases">
                    <el-option label="船舶报告" value="船舶报告" />
                    <el-option label="港口报告" value="港口报告" />
                    <el-option label="航道报告" value="航道报告" />
                    <el-option label="其他报告" value="其他报告" />
                  </el-select>
                </el-form-item>
                <el-form-item label="搜索">
                  <el-input v-model="filterForm.search" placeholder="输入案例名称" clearable @input="loadCases" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="loadCases"><el-icon><Search /></el-icon>查询</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div class="statistics-section">
              <div class="total-count"><span class="count-label">报告总数：</span><span class="count-value">{{ totalCases }}</span></div>
            </div>

            <div class="cases-list">
              <el-card v-for="caseItem in cases" :key="caseItem.id" class="case-card">
                <div class="case-header">
                  <h3>{{ caseItem.name }}</h3>
                  <div class="case-meta">
                    <span class="business-type">{{ caseItem.businessType }}</span>
                    <span class="uploader">{{ caseItem.uploader }}</span>
                    <span class="upload-date">{{ caseItem.createDate || caseItem.uploadDate }}</span>
                    <span class="case-status">{{ caseItem.status || '现行' }}</span>
                  </div>
                </div>
                <div class="case-content"><p class="case-description">{{ caseItem.description }}</p></div>
                <div class="case-actions">
                  <el-button type="primary" @click="handlePreviewCase(caseItem.id)"><el-icon><View /></el-icon>预览</el-button>
                  <el-button type="success" @click="handleDownloadCase(caseItem.id)"><el-icon><Download /></el-icon>下载</el-button>
                  <el-button type="danger" @click="handleDeleteCase(caseItem.id)"><el-icon><Delete /></el-icon>删除</el-button>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="标准库" name="standards">
          <div class="library-content">
            <div class="filter-section">
              <el-form :inline="true" :model="standardFilterForm" class="filter-form">
                <el-form-item label="标准类型">
                  <el-select v-model="standardFilterForm.standardType" placeholder="请选择标准类型" clearable @change="loadStandards">
                    <el-option label="国家标准" value="国家标准" />
                    <el-option label="行业标准" value="行业标准" />
                    <el-option label="地方标准" value="地方标准" />
                    <el-option label="企业标准" value="企业标准" />
                  </el-select>
                </el-form-item>
                <el-form-item label="搜索">
                  <el-input v-model="standardFilterForm.search" placeholder="输入标准名称" clearable @input="loadStandards" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="loadStandards"><el-icon><Search /></el-icon>查询</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div class="statistics-section">
              <div class="total-count"><span class="count-label">标准总数：</span><span class="count-value">{{ totalStandards }}</span></div>
            </div>

            <div class="cases-list">
              <el-card v-for="standard in standards" :key="standard.id" class="case-card">
                <div class="case-header">
                  <h3>{{ standard.name }}</h3>
                  <div class="case-meta">
                    <span class="business-type">{{ standard.standardType }}</span>
                    <span class="uploader">{{ standard.uploader }}</span>
                    <span class="upload-date">{{ standard.createDate || standard.uploadDate }}</span>
                    <el-select v-if="standard.isOwner" v-model="standard.status" size="small" @change="handleStatusChange(standard.id, standard.status)" class="status-select">
                      <el-option label="待发布" value="待发布" />
                      <el-option label="现行" value="现行" />
                      <el-option label="废止" value="废止" />
                    </el-select>
                    <span v-else class="case-status">{{ standard.status || '现行' }}</span>
                  </div>
                </div>
                <div class="case-content"><p class="case-description">{{ standard.description }}</p></div>
                <div class="case-actions">
                  <el-button type="primary" @click="handlePreviewStandard(standard.id)"><el-icon><View /></el-icon>预览</el-button>
                  <el-button type="success" @click="handleDownloadStandard(standard.id)"><el-icon><Download /></el-icon>下载</el-button>
                  <el-button v-if="standard.isOwner" type="danger" @click="handleDeleteStandard(standard.id)"><el-icon><Delete /></el-icon>删除</el-button>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 上传文件对话框 -->
    <el-dialog v-model="uploadDialogVisible" :title="activeLibrary === 'cases' ? '上传报告案例' : '上传标准'" width="500px">
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="文件名称"><el-input v-model="uploadForm.name" placeholder="请输入文件名称" /></el-form-item>
        <el-form-item v-if="activeLibrary === 'cases'" label="业务类型">
          <el-select v-model="uploadForm.businessType" placeholder="请选择业务类型">
            <el-option label="船舶报告" value="船舶报告" /><el-option label="港口报告" value="港口报告" /><el-option label="航道报告" value="航道报告" /><el-option label="其他报告" value="其他报告" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="标准类型">
          <el-select v-model="uploadForm.standardType" placeholder="请选择标准类型">
            <el-option label="国家标准" value="国家标准" /><el-option label="行业标准" value="行业标准" /><el-option label="地方标准" value="地方标准" /><el-option label="企业标准" value="企业标准" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件描述"><el-input v-model="uploadForm.description" type="textarea" placeholder="请输入文件描述" :rows="3" /></el-form-item>
        <el-form-item label="上传文件">
          <el-upload class="upload-demo" action="#" :auto-upload="false" :on-change="handleFileChange" :file-list="uploadForm.files">
            <el-button type="primary"><el-icon><Upload /></el-icon>选择文件</el-button>
            <template #tip><div class="el-upload__tip">支持上传PDF、Word等格式文件</div></template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmitUpload">确定上传</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Upload, Search, View, Delete, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCases, createCase, deleteCase, getStandards, createStandard, updateStandardStatus, deleteStandard, getCase, getStandard } from '../api/cases'
import request from '../api/request'

const loading = ref(false)
const submitting = ref(false)
const activeLibrary = ref('cases')
const cases = ref([])
const standards = ref([])
const totalCases = ref(0)
const totalStandards = ref(0)

const filterForm = ref({ businessType: '', search: '' })
const standardFilterForm = ref({ standardType: '', search: '' })
const uploadDialogVisible = ref(false)
const uploadForm = ref({ name: '', businessType: '', standardType: '', description: '', files: [] })

const loadCases = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filterForm.value.businessType) params.businessType = filterForm.value.businessType
    if (filterForm.value.search) params.search = filterForm.value.search
    const res = await getCases(params)
    cases.value = res.data?.list || []
    totalCases.value = res.data?.total || cases.value.length
  } catch (e) {} finally { loading.value = false }
}

const loadStandards = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (standardFilterForm.value.standardType) params.standardType = standardFilterForm.value.standardType
    if (standardFilterForm.value.search) params.search = standardFilterForm.value.search
    const res = await getStandards(params)
    standards.value = res.data?.list || []
    totalStandards.value = res.data?.total || standards.value.length
  } catch (e) {} finally { loading.value = false }
}

const loadData = () => { if (activeLibrary.value === 'cases') loadCases(); else loadStandards() }

const handleUploadCase = () => { uploadForm.value = { name: '', businessType: '', standardType: '', description: '', files: [] }; uploadDialogVisible.value = true }
const handleFileChange = (file) => { uploadForm.value.files = [file] }

const handleSubmitUpload = async () => {
  if (!uploadForm.value.name) { ElMessage.warning('请输入文件名称'); return }
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('name', uploadForm.value.name)
    fd.append('description', uploadForm.value.description)
    if (activeLibrary.value === 'cases') fd.append('businessType', uploadForm.value.businessType)
    else fd.append('standardType', uploadForm.value.standardType)
    if (uploadForm.value.files.length > 0) fd.append('file', uploadForm.value.files[0].raw)
    if (activeLibrary.value === 'cases') await createCase(fd); else await createStandard(fd)
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    loadData()
  } catch (e) {} finally { submitting.value = false }
}

const handlePreviewCase = async (id) => {
  try {
    const res = await getCase(id)
    const caseItem = res.data
    if (!caseItem.file_path) {
      ElMessage.warning('该案例没有上传文件')
      return
    }
    const ext = caseItem.file_path.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      const token = localStorage.getItem('token')
      window.open(`/api/cases/cases/${id}/download?token=${token}`, '_blank')
    } else {
      ElMessage.info('该文件类型不支持在线预览，请下载查看')
    }
  } catch (e) {
    ElMessage.error('获取案例信息失败')
  }
}

const handlePreviewStandard = async (id) => {
  try {
    const res = await getStandard(id)
    const standard = res.data
    if (!standard.file_path) {
      ElMessage.warning('该标准没有上传文件')
      return
    }
    const ext = standard.file_path.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      const token = localStorage.getItem('token')
      window.open(`/api/cases/standards/${id}/download?token=${token}`, '_blank')
    } else {
      ElMessage.info('该文件类型不支持在线预览，请下载查看')
    }
  } catch (e) {
    ElMessage.error('获取标准信息失败')
  }
}

const handleDownloadCase = async (id) => {
  try {
    const token = localStorage.getItem('token')
    const res = await request.get(`/cases/cases/${id}/download`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` }
    })
    const blob = new Blob([res])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const caseItem = cases.value.find(c => c.id === id)
    link.download = caseItem?.name || `case_${id}`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (e) {
    ElMessage.error('下载失败')
  }
}

const handleDownloadStandard = async (id) => {
  try {
    const token = localStorage.getItem('token')
    const res = await request.get(`/cases/standards/${id}/download`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` }
    })
    const blob = new Blob([res])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const standard = standards.value.find(s => s.id === id)
    link.download = standard?.name || `standard_${id}`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (e) {
    ElMessage.error('下载失败')
  }
}

const handleDeleteCase = (id) => {
  ElMessageBox.confirm('确定要删除此案例吗？', '删除确认', { type: 'warning' })
    .then(async () => { try { await deleteCase(id); ElMessage.success('删除成功'); loadCases() } catch (e) {} }).catch(() => {})
}
const handleDeleteStandard = (id) => {
  ElMessageBox.confirm('确定要删除此标准吗？', '删除确认', { type: 'warning' })
    .then(async () => { try { await deleteStandard(id); ElMessage.success('删除成功'); loadStandards() } catch (e) {} }).catch(() => {})
}
const handleStatusChange = async (id, status) => {
  try { await updateStandardStatus(id, status); ElMessage.success('状态已更新') } catch (e) {}
}

onMounted(() => { loadCases() })
</script>

<style scoped>
.report-cases-container { padding: 20px; background-color: #f5f7fa; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e4e7ed; }
.page-header h1 { font-size: 24px; font-weight: 600; color: #303133; margin: 0; }
.filter-section { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); margin-bottom: 20px; }
.filter-form { display: flex; align-items: center; gap: 10px; }
.cases-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
.case-card { transition: all 0.3s ease; border-radius: 8px; overflow: hidden; }
.case-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); transform: translateY(-2px); }
.case-header { margin-bottom: 16px; }
.case-header h3 { font-size: 18px; font-weight: 600; color: #303133; margin: 0 0 12px 0; }
.case-meta { display: flex; gap: 15px; font-size: 14px; color: #606266; flex-wrap: wrap; margin-bottom: 16px; }
.business-type { background-color: #ecf5ff; color: #409eff; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.case-status { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.status-select { width: 80px; font-size: 12px; }
.statistics-section { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
.total-count { margin-bottom: 10px; }
.count-label { font-size: 14px; color: #606266; }
.count-value { font-size: 18px; font-weight: 600; color: #0A3D62; margin-left: 10px; }
.library-tabs { background-color: white; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); overflow: hidden; margin-bottom: 20px; padding-left: 24px; }
.library-content { padding: 20px; }
.case-content { margin-bottom: 20px; }
.case-description { font-size: 14px; color: #606266; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.case-actions { display: flex; gap: 10px; justify-content: flex-start; margin-top: 16px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 10px; }
@media (max-width: 768px) { .page-header { flex-direction: column; align-items: flex-start; gap: 10px; } .cases-list { grid-template-columns: 1fr; } }
</style>
