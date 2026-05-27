<template>
  <div class="report-edit">
    <div class="report-header">
      <div class="header-info">
        <div class="report-title-section">
          <el-input v-model="reportInfo.name" class="report-title-input" placeholder="请输入报告名称" />
          <div class="report-id-section">
            <span class="id-label">报告编号：</span>
            <el-input v-model="reportInfo.code" class="report-id-input" placeholder="系统自动生成" :disabled="true" />
          </div>
        </div>
        <div class="report-meta">
          <span class="meta-item">类型：<el-tag>{{ getTypeName(reportInfo.type) }}</el-tag></span>
          <span class="meta-divider">|</span>
          <span class="meta-item">状态：<span class="status-badge">{{ getStatusText(reportInfo.status) }}</span></span>
          <span class="meta-divider">|</span>
          <span class="meta-item">
            <span class="team-label">团队成员：</span>
            <el-tag v-for="member in reportInfo.teamMembers" :key="member.id" class="team-member-tag">{{ member.name }}</el-tag>
            <el-button type="primary" plain size="small" @click="openTeamModal" class="invite-button"><el-icon><Plus /></el-icon>邀请</el-button>
          </span>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="saveReport" class="action-button" :loading="saving"><el-icon><Folder /></el-icon>保存</el-button>
        <el-button type="primary" plain class="action-button" @click="previewReport"><el-icon><View /></el-icon>预览</el-button>
        <el-button type="success" plain class="action-button" @click="openDocEditor"><el-icon><EditPen /></el-icon>文档编辑</el-button>
        <el-button type="primary" class="action-button submit-button" @click="openSubmitModal" :disabled="reportInfo.status !== 'draft' && reportInfo.status !== 'revise'"><el-icon><Promotion /></el-icon>提交审核</el-button>
      </div>
    </div>

    <el-dialog v-model="teamModalVisible" title="管理团队成员" width="500px">
      <el-form label-width="100px">
        <el-form-item label="邀请成员">
          <el-select v-model="teamForm.selectedMembers" multiple placeholder="请选择成员" class="team-select">
            <el-option v-for="u in allUsers" :key="u.id" :label="u.name" :value="String(u.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="现有成员">
          <div class="existing-members">
            <el-tag v-for="member in reportInfo.teamMembers" :key="member.id" class="existing-member-tag">
              {{ member.name }}
              <el-button size="small" type="danger" @click="removeMember(member.id)" class="remove-button"><el-icon><Delete /></el-icon></el-button>
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teamModalVisible = false">取消</el-button>
        <el-button type="primary" @click="addMembers">确定</el-button>
      </template>
    </el-dialog>

    <div class="edit-area">
      <div class="outline-panel">
        <div class="panel-header">
          <h3 class="panel-title">报告大纲</h3>
          <p class="panel-subtitle">点击章节进入编辑</p>
        </div>
        <el-tree :data="reportOutline" node-key="id" :default-expand-all="true" @node-click="handleNodeClick" class="outline-tree" :highlight-current="true">
          <template #default="{ node, data }">
            <div class="outline-item" :class="{ 'active': activeSection === data.id, 'completed': isSectionCompleted(data.id) }">
              <div class="outline-item-content">
                <div class="outline-item-icon" :class="data.type === 'common' ? 'common' : 'personal'"></div>
                <span class="outline-item-label">{{ node.label }}</span>
              </div>
              <el-icon v-if="isSectionCompleted(data.id)" class="check-icon"><CircleCheck /></el-icon>
            </div>
          </template>
        </el-tree>
      </div>

      <div class="content-panel">
        <SectionEditor
          v-if="activeSection"
          :section-id="activeSection"
          :section-info="getSectionInfo(activeSection)"
          :report-type="reportInfo.type"
          :form-data="formData"
          :image-list="imageList"
          @update="handleSectionUpdate"
          @upload-image="handleImageUpload"
          @delete-image="handleImageDelete"
        />
        <div v-else class="empty-state">
          <el-icon class="empty-icon"><Document /></el-icon>
          <h4 class="empty-title">请选择编辑章节</h4>
          <p class="empty-text">从左侧大纲选择一个章节开始编辑内容</p>
        </div>
      </div>
    </div>

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

    <el-dialog v-model="previewModalVisible" title="报告预览" width="90%" top="5vh">
      <div class="preview-content">
        <ReportPreview :report-info="reportInfo" :form-data="formData" :image-list="imageList" :reviews="reviews" />
      </div>
      <template #footer>
        <el-button @click="previewModalVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Folder, View, Promotion, Plus, Delete, Document, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getReport, updateReport, submitReport, uploadImages, deleteImage, updateTeam } from '../api/reports'
import { getUsers } from '../api/users'
import SectionEditor from '../components/SectionEditor.vue'
import ReportPreview from '../components/ReportPreview.vue'

const route = useRoute()
const router = useRouter()
const saving = ref(false)
const submitting = ref(false)
const allUsers = ref<any[]>([])
const reviews = ref<any[]>([])

const REPORT_TYPES = {
  ship: { name: '船舶勘验报告', outline: getShipOutline() },
  water: { name: '水土保持监测报告', outline: getWaterOutline() },
  port: { name: '港口工程报告', outline: getPortOutline() },
  ocean: { name: '海洋环境影响评价报告', outline: getOceanOutline() },
  channel: { name: '航道通航条件影响评价报告', outline: getChannelOutline() }
}

function getShipOutline() {
  return [
    { id: 'intro', label: '1. 报告前言', type: 'common' },
    { id: 'overview', label: '2. 项目概况', type: 'personal' },
    { id: 'basis', label: '3. 编制依据', type: 'common' },
    { id: 'inspection', label: '4. 勘验内容', type: 'personal', children: [
      { id: 'hull', label: '4.1 船体结构', type: 'personal' },
      { id: 'engine', label: '4.2 轮机设备', type: 'personal' },
      { id: 'electrical', label: '4.3 电气设备', type: 'personal' },
      { id: 'safety', label: '4.4 安全设备', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal' },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal' },
    { id: 'appendix', label: '7. 附录', type: 'common' }
  ]
}

function getWaterOutline() {
  return [
    { id: 'intro', label: '1. 报告前言', type: 'common' },
    { id: 'overview', label: '2. 项目概况', type: 'personal' },
    { id: 'basis', label: '3. 编制依据', type: 'common' },
    { id: 'monitoring', label: '4. 监测内容', type: 'personal', children: [
      { id: 'monitoring-scope', label: '4.1 监测范围', type: 'personal' },
      { id: 'monitoring-method', label: '4.2 监测方法', type: 'personal' },
      { id: 'monitoring-result', label: '4.3 监测结果', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal' },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal' },
    { id: 'appendix', label: '7. 附录', type: 'common' }
  ]
}

function getPortOutline() {
  return [
    { id: 'intro', label: '1. 报告前言', type: 'common' },
    { id: 'overview', label: '2. 项目概况', type: 'personal' },
    { id: 'basis', label: '3. 编制依据', type: 'common' },
    { id: 'engineering', label: '4. 工程内容', type: 'personal', children: [
      { id: 'engineering-scope', label: '4.1 工程范围', type: 'personal' },
      { id: 'engineering-quality', label: '4.2 工程质量', type: 'personal' },
      { id: 'engineering-safety', label: '4.3 安全评估', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal' },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal' },
    { id: 'appendix', label: '7. 附录', type: 'common' }
  ]
}

function getOceanOutline() {
  return [
    { id: 'intro', label: '1. 报告前言', type: 'common' },
    { id: 'overview', label: '2. 项目概况', type: 'personal' },
    { id: 'basis', label: '3. 编制依据', type: 'common' },
    { id: 'environment', label: '4. 环境影响', type: 'personal', children: [
      { id: 'env-water', label: '4.1 水环境影响', type: 'personal' },
      { id: 'env-eco', label: '4.2 生态影响', type: 'personal' },
      { id: 'env-mitigation', label: '4.3 缓解措施', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal' },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal' },
    { id: 'appendix', label: '7. 附录', type: 'common' }
  ]
}

function getChannelOutline() {
  return [
    { id: 'intro', label: '1. 报告前言', type: 'common' },
    { id: 'overview', label: '2. 项目概况', type: 'personal' },
    { id: 'basis', label: '3. 编制依据', type: 'common' },
    { id: 'navigation', label: '4. 通航条件', type: 'personal', children: [
      { id: 'nav-depth', label: '4.1 航道深度', type: 'personal' },
      { id: 'nav-width', label: '4.2 航道宽度', type: 'personal' },
      { id: 'nav-safety', label: '4.3 通航安全', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal' },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal' },
    { id: 'appendix', label: '7. 附录', type: 'common' }
  ]
}

const reportOutline = computed(() => {
  const type = reportInfo.value.type || 'ship'
  return REPORT_TYPES[type]?.outline || REPORT_TYPES.ship.outline
})

const activeSection = ref('')
const reportInfo = ref({ id: 0, name: '', code: '', type: 'ship', status: 'draft', teamMembers: [] as any[] })

const formData = ref<Record<string, any>>({
  intro: '',
  projectBackground: '',
  inspectionPurpose: '',
  basis: '',
  hull: '',
  engine: '',
  electrical: '',
  safety: '',
  monitoringScope: '',
  monitoringMethod: '',
  monitoringResult: '',
  engineeringScope: '',
  engineeringQuality: '',
  engineeringSafety: '',
  envWater: '',
  envEco: '',
  envMitigation: '',
  navDepth: '',
  navWidth: '',
  navSafety: '',
  conclusion: '',
  recommendations: '',
  appendix: '',
  shipName: '',
  shipType: '',
  buildDate: '',
  tonnage: 0,
  registryPort: '',
  projectName: '',
  projectLocation: '',
  projectDate: '',
  clientName: ''
})

const imageList = ref<any[]>([])
const submitModalVisible = ref(false)
const submitForm = ref({ description: '' })
const teamModalVisible = ref(false)
const teamForm = ref({ selectedMembers: [] as string[] })
const previewModalVisible = ref(false)

const getTypeName = (type: string) => REPORT_TYPES[type]?.name || type
const getStatusText = (status: string) => ({ draft: '编制中', pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '已退回', revise: '修订中', published: '已出版', archived: '已归档' }[status] || status)

const getSectionInfo = (sectionId: string) => {
  const findSection = (sections: any[]): any => {
    for (const s of sections) {
      if (s.id === sectionId) return s
      if (s.children) {
        const found = findSection(s.children)
        if (found) return found
      }
    }
    return null
  }
  return findSection(reportOutline.value)
}

const isSectionCompleted = (sectionId: string) => {
  const sectionFields: Record<string, string[]> = {
    'intro': ['intro'],
    'overview': ['projectBackground', 'inspectionPurpose'],
    'basis': ['basis'],
    'hull': ['hull'],
    'engine': ['engine'],
    'electrical': ['electrical'],
    'safety': ['safety'],
    'monitoring-scope': ['monitoringScope'],
    'monitoring-method': ['monitoringMethod'],
    'monitoring-result': ['monitoringResult'],
    'engineering-scope': ['engineeringScope'],
    'engineering-quality': ['engineeringQuality'],
    'engineering-safety': ['engineeringSafety'],
    'env-water': ['envWater'],
    'env-eco': ['envEco'],
    'env-mitigation': ['envMitigation'],
    'nav-depth': ['navDepth'],
    'nav-width': ['navWidth'],
    'nav-safety': ['navSafety'],
    'conclusion': ['conclusion'],
    'appendix': ['appendix']
  }
  const fields = sectionFields[sectionId]
  if (!fields) return false
  return fields.some(f => formData.value[f] && formData.value[f].trim?.() || formData.value[f] > 0)
}

const handleNodeClick = (data: any) => { activeSection.value = data.id }

const handleSectionUpdate = (data: any) => {
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      formData.value[key] = data[key]
    }
  })
  autoSave()
}

let autoSaveTimer: any = null
const autoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    saveReport(true)
  }, 3000)
}

const loadReport = async () => {
  const reportId = route.query.id
  if (!reportId) return
  try {
    const res: any = await getReport(Number(reportId))
    console.log('Loaded report:', res)
    const r = res.data
    reportInfo.value = {
      id: r.id,
      name: r.name,
      code: r.code,
      type: r.type,
      status: r.status,
      teamMembers: r.members || []
    }
    console.log('Report content:', r.content)
    if (r.content) {
      Object.keys(formData.value).forEach(key => {
        if (r.content[key] !== undefined) formData.value[key] = r.content[key]
      })
    }
    console.log('formData after load:', formData.value)
    if (r.images) {
      imageList.value = r.images.map(img => ({ id: img.id, name: img.name, url: `/api/reports/${r.id}/images/${img.id}` }))
    }
    if (r.reviews) reviews.value = r.reviews
    
    // 默认选中第一个章节
    if (!activeSection.value && reportOutline.value.length > 0) {
      activeSection.value = reportOutline.value[0].id
    }
  } catch (e) {
    console.error('Load report error:', e)
  }
}

const loadUsers = async () => {
  try {
    const res: any = await getUsers({ page: 1, pageSize: 100 })
    allUsers.value = res.data?.list || []
  } catch (e) {}
}

const saveReport = async (silent = false) => {
  if (!reportInfo.value.id) {
    console.error('No report ID')
    return
  }
  saving.value = true
  console.log('Saving report:', reportInfo.value.id)
  console.log('Content to save:', formData.value)
  try {
    const res = await updateReport(reportInfo.value.id, {
      name: reportInfo.value.name,
      content: formData.value
    })
    console.log('Save response:', res)
    if (!silent) ElMessage.success('报告已保存')
  } catch (e) {
    console.error('Save error:', e)
  } finally { saving.value = false }
}

const openSubmitModal = () => {
  if (!formData.value.projectBackground || !formData.value.conclusion) {
    ElMessage.warning('请先完成项目概况和分析结论')
    return
  }
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
  } catch (e) {} finally { submitting.value = false }
}

const previewReport = () => { previewModalVisible.value = true }

const handleImageUpload = async (file: any) => {
  try {
    const fd = new FormData()
    fd.append('images', file.raw)
    const res: any = await uploadImages(reportInfo.value.id, fd)
    const newImages = res.data || []
    newImages.forEach(img => {
      imageList.value.push({ id: img.id, name: img.name, url: img.url })
    })
    ElMessage.success('图片上传成功')
  } catch (e) {}
}

const handleImageDelete = async (imageId: number) => {
  try {
    await deleteImage(reportInfo.value.id, imageId)
    imageList.value = imageList.value.filter(img => img.id !== imageId)
    ElMessage.success('图片已删除')
  } catch (e) {}
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
  } catch (e) {}
}

const removeMember = async (memberId: number) => {
  try {
    await updateTeam(reportInfo.value.id, { removeMemberId: memberId })
    ElMessage.success('成员已移除')
    loadReport()
  } catch (e) {}
}

watch(() => route.query.id, (newId, oldId) => {
  if (newId && String(newId) !== String(oldId)) {
    activeSection.value = ''
    formData.value = {
      intro: '',
      projectBackground: '',
      inspectionPurpose: '',
      basis: '',
      hull: '',
      engine: '',
      electrical: '',
      safety: '',
      monitoringScope: '',
      monitoringMethod: '',
      monitoringResult: '',
      engineeringScope: '',
      engineeringQuality: '',
      engineeringSafety: '',
      envWater: '',
      envEco: '',
      envMitigation: '',
      navDepth: '',
      navWidth: '',
      navSafety: '',
      conclusion: '',
      recommendations: '',
      appendix: '',
      shipName: '',
      shipType: '',
      buildDate: '',
      tonnage: 0,
      registryPort: '',
      projectName: '',
      projectLocation: '',
      projectDate: '',
      clientName: ''
    }
    imageList.value = []
    reviews.value = []
    loadReport()
  }
})


const openDocEditor = () => {
  if (!reportInfo.value.id) {
    ElMessage.warning('请先保存报告')
    return
  }
  router.push({ path: '/doc-editor', query: { id: String(reportInfo.value.id) } })
}

onMounted(() => {
  if (route.query.id) {
    loadReport()
  }
  loadUsers()
})
</script>

<style scoped lang="scss">
.report-edit { height: calc(100vh - 64px); display: flex; flex-direction: column; background: #f5f7fa; }
.report-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: white; border-bottom: 1px solid #e4e7ed; }
.header-info { flex: 1; }
.report-title-section { margin-bottom: 8px; }
.report-title-input { font-size: 18px; font-weight: 600; border: none; border-bottom: 1px solid #dcdfe6; &:focus { border-color: #409eff; } }
.report-id-section { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.id-label { font-size: 13px; color: #909399; }
.report-id-input { width: 150px; font-size: 13px; }
.report-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #606266; }
.team-member-tag { margin-right: 4px; }
.invite-button { margin-left: 8px; }
.header-actions { display: flex; gap: 12px; }
.action-button { padding: 8px 16px; }
.submit-button { background: #409eff; }
.edit-area { flex: 1; display: flex; overflow: hidden; }
.outline-panel { width: 280px; background: white; border-right: 1px solid #e4e7ed; overflow-y: auto; }
.panel-header { padding: 16px; border-bottom: 1px solid #e4e7ed; }
.panel-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.panel-subtitle { font-size: 12px; color: #909399; }
.outline-tree { padding: 8px 0; }
.outline-tree :deep(.el-tree-node__content) { height: auto !important; padding: 0 !important; }
.outline-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; min-height: 44px; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; line-height: 1.5; }
.outline-item:hover { background: #f5f7fa; }
.outline-item.active { background: #ecf5ff; border-left-color: #409eff; }
.outline-item.completed .outline-item-icon { background: #67c23a; }
.outline-item-content { display: flex; align-items: center; gap: 8px; flex: 1; }
.outline-item-icon { width: 8px; height: 8px; border-radius: 50%; background: #909399; flex-shrink: 0; }
.outline-item-icon.common { background: #67c23a; }
.outline-item-icon.personal { background: #409eff; }
.outline-item-label { font-size: 14px; line-height: 1.5; white-space: nowrap; }
.check-icon { color: #67c23a; flex-shrink: 0; }
.content-panel { flex: 1; padding: 24px; overflow-y: auto; background: #f5f7fa; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; background: white; border-radius: 8px; }
.empty-icon { font-size: 48px; color: #c0c4cc; margin-bottom: 16px; }
.empty-title { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
.empty-text { font-size: 14px; color: #909399; }
.existing-members { display: flex; flex-wrap: wrap; gap: 8px; }
.existing-member-tag { display: flex; align-items: center; gap: 8px; }
.remove-button { padding: 2px; }
.team-select { width: 100%; }
.preview-content { background: white; padding: 24px; min-height: 60vh; }
</style>