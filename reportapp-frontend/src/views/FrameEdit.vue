<template>
  <div class="frame-edit">
    <div class="frame-header">
      <div class="header-info">
        <el-input v-model="frameInfo.name" class="frame-title-input" placeholder="请输入框架名称" />
        <div class="frame-meta">
          <span class="meta-item">类型：<el-select v-model="frameInfo.type" style="width:150px">
            <el-option label="船舶勘验报告" value="ship" />
            <el-option label="水土保持监测报告" value="water" />
            <el-option label="港口工程报告" value="port" />
            <el-option label="海洋环境影响评价报告" value="ocean" />
            <el-option label="航道通航条件影响评价报告" value="channel" />
          </el-select></span>
          <span class="meta-item">
            <el-switch v-model="frameInfo.is_public" active-text="公共框架" inactive-text="个人框架" />
          </span>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="saveFrame" :loading="saving"><el-icon><Folder /></el-icon>保存</el-button>
        <el-button @click="goBack"><el-icon><Back /></el-icon>返回</el-button>
      </div>
    </div>

    <div class="edit-area">
      <div class="outline-panel">
        <div class="panel-header">
          <h3>章节大纲</h3>
          <el-button type="primary" size="small" @click="addSection"><el-icon><Plus /></el-icon>添加章节</el-button>
        </div>
        <el-tree :data="outlineData" node-key="id" :default-expand-all="true" draggable @node-click="handleNodeClick" @node-drop="handleDrop">
          <template #default="{ node, data }">
            <div class="outline-item" :class="{ 'active': activeSection === data.id }">
              <span class="outline-label">{{ data.label }}</span>
              <div class="outline-actions">
                <el-button size="small" link @click.stop="editSectionName(data)"><el-icon><Edit /></el-icon></el-button>
                <el-button size="small" link type="danger" @click.stop="deleteSection(data)"><el-icon><Delete /></el-icon></el-button>
              </div>
            </div>
          </template>
        </el-tree>
      </div>

      <div class="content-panel">
        <div v-if="activeSection" class="section-edit">
          <el-form label-width="100px">
            <el-form-item label="章节名称">
              <el-input v-model="currentSection.label" placeholder="请输入章节名称" @input="updateOutline" />
            </el-form-item>
            <el-form-item label="章节类型">
              <el-radio-group v-model="currentSection.type" @change="updateOutline">
                <el-radio label="common">共性模块（所有报告必填）</el-radio>
                <el-radio label="personal">个性模块（根据实际情况填写）</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="章节说明">
              <el-input v-model="currentSection.description" type="textarea" rows="3" placeholder="请输入章节说明，指导用户填写" @input="updateOutline" />
            </el-form-item>
            <el-form-item label="是否必填">
              <el-switch v-model="currentSection.required" @change="updateOutline" />
            </el-form-item>
            <el-form-item label="字段配置">
              <div class="fields-config">
                <el-button type="primary" size="small" @click="addField"><el-icon><Plus /></el-icon>添加字段</el-button>
                <div class="fields-list" v-if="currentSection.fields && currentSection.fields.length > 0">
                  <div v-for="(field, index) in currentSection.fields" :key="index" class="field-item">
                    <el-input v-model="field.name" placeholder="字段名称" style="width:150px" @input="updateOutline" />
                    <el-select v-model="field.type" placeholder="字段类型" style="width:120px" @change="updateOutline">
                      <el-option label="文本输入" value="text" />
                      <el-option label="多行文本" value="textarea" />
                      <el-option label="数字" value="number" />
                      <el-option label="日期" value="date" />
                      <el-option label="选择框" value="select" />
                      <el-option label="单选" value="radio" />
                    </el-select>
                    <el-input v-model="field.placeholder" placeholder="提示文字" style="width:150px" @input="updateOutline" />
                    <el-button size="small" type="danger" @click="removeField(index)"><el-icon><Delete /></el-icon></el-button>
                  </div>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="子章节">
              <el-button type="primary" size="small" @click="addSubSection"><el-icon><Plus /></el-icon>添加子章节</el-button>
            </el-form-item>
          </el-form>
        </div>
        <div v-else class="empty-state">
          <el-icon class="empty-icon"><Document /></el-icon>
          <h4>请选择章节</h4>
          <p>从左侧大纲选择一个章节进行编辑</p>
        </div>
      </div>
    </div>

    <el-dialog v-model="sectionNameDialogVisible" title="修改章节名称" width="300px">
      <el-input v-model="editingSectionName" placeholder="请输入新的章节名称" />
      <template #footer>
        <el-button @click="sectionNameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSectionName">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Folder, Back, Plus, Edit, Delete, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getFrame, createFrame, updateFrame } from '../api/frames'

const route = useRoute()
const router = useRouter()
const saving = ref(false)

const frameInfo = ref({
  id: 0,
  name: '',
  type: 'ship',
  is_public: true,
  description: ''
})

const outlineData = ref<any[]>([])
const activeSection = ref('')
const currentSection = ref<any>({})
const sectionNameDialogVisible = ref(false)
const editingSectionName = ref('')
const editingSectionData = ref<any>(null)

const defaultOutlines = {
  ship: [
    { id: 'intro', label: '1. 报告前言', type: 'common', required: true, fields: [{ name: '前言内容', type: 'textarea', placeholder: '请输入报告前言' }] },
    { id: 'overview', label: '2. 项目概况', type: 'personal', required: true, fields: [] },
    { id: 'basis', label: '3. 编制依据', type: 'common', required: true, fields: [{ name: '依据内容', type: 'textarea', placeholder: '请输入编制依据' }] },
    { id: 'inspection', label: '4. 勘验内容', type: 'personal', required: true, children: [
      { id: 'hull', label: '4.1 船体结构', type: 'personal', required: true },
      { id: 'engine', label: '4.2 轮机设备', type: 'personal', required: true },
      { id: 'electrical', label: '4.3 电气设备', type: 'personal', required: true }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal', required: false },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal', required: true },
    { id: 'appendix', label: '7. 附录', type: 'common', required: false }
  ],
  water: [
    { id: 'intro', label: '1. 报告前言', type: 'common', required: true },
    { id: 'overview', label: '2. 项目概况', type: 'personal', required: true },
    { id: 'basis', label: '3. 编制依据', type: 'common', required: true },
    { id: 'monitoring', label: '4. 监测内容', type: 'personal', required: true, children: [
      { id: 'monitoring-scope', label: '4.1 监测范围', type: 'personal' },
      { id: 'monitoring-method', label: '4.2 监测方法', type: 'personal' },
      { id: 'monitoring-result', label: '4.3 监测结果', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal', required: false },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal', required: true },
    { id: 'appendix', label: '7. 附录', type: 'common', required: false }
  ],
  port: [
    { id: 'intro', label: '1. 报告前言', type: 'common', required: true },
    { id: 'overview', label: '2. 项目概况', type: 'personal', required: true },
    { id: 'basis', label: '3. 编制依据', type: 'common', required: true },
    { id: 'engineering', label: '4. 工程内容', type: 'personal', required: true, children: [
      { id: 'engineering-scope', label: '4.1 工程范围', type: 'personal' },
      { id: 'engineering-quality', label: '4.2 工程质量', type: 'personal' },
      { id: 'engineering-safety', label: '4.3 安全评估', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal', required: false },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal', required: true },
    { id: 'appendix', label: '7. 附录', type: 'common', required: false }
  ],
  ocean: [
    { id: 'intro', label: '1. 报告前言', type: 'common', required: true },
    { id: 'overview', label: '2. 项目概况', type: 'personal', required: true },
    { id: 'basis', label: '3. 编制依据', type: 'common', required: true },
    { id: 'environment', label: '4. 环境影响', type: 'personal', required: true, children: [
      { id: 'env-water', label: '4.1 水环境影响', type: 'personal' },
      { id: 'env-eco', label: '4.2 生态影响', type: 'personal' },
      { id: 'env-mitigation', label: '4.3 缓解措施', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal', required: false },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal', required: true },
    { id: 'appendix', label: '7. 附录', type: 'common', required: false }
  ],
  channel: [
    { id: 'intro', label: '1. 报告前言', type: 'common', required: true },
    { id: 'overview', label: '2. 项目概况', type: 'personal', required: true },
    { id: 'basis', label: '3. 编制依据', type: 'common', required: true },
    { id: 'navigation', label: '4. 通航条件', type: 'personal', required: true, children: [
      { id: 'nav-depth', label: '4.1 航道深度', type: 'personal' },
      { id: 'nav-width', label: '4.2 航道宽度', type: 'personal' },
      { id: 'nav-safety', label: '4.3 通航安全', type: 'personal' }
    ]},
    { id: 'photos', label: '5. 现场照片', type: 'personal', required: false },
    { id: 'conclusion', label: '6. 分析结论', type: 'personal', required: true },
    { id: 'appendix', label: '7. 附录', type: 'common', required: false }
  ]
}

const loadFrame = async () => {
  const frameId = route.query.id
  if (!frameId) {
    // 新建框架，使用默认大纲
    const type = route.query.type || 'ship'
    frameInfo.value.type = String(type)
    outlineData.value = JSON.parse(JSON.stringify(defaultOutlines[String(type)] || defaultOutlines.ship))
    return
  }
  try {
    const res: any = await getFrame(Number(frameId))
    const f = res.data
    frameInfo.value = {
      id: f.id,
      name: f.name,
      type: f.type,
      is_public: f.is_public === 1,
      description: f.description || ''
    }
    if (f.content && f.content.sections) {
      outlineData.value = f.content.sections
    } else {
      outlineData.value = JSON.parse(JSON.stringify(defaultOutlines[f.type] || defaultOutlines.ship))
    }
  } catch (e) {
    console.error('Load frame error:', e)
  }
}

const handleNodeClick = (data: any) => {
  activeSection.value = data.id
  currentSection.value = data
}

const findSection = (sections: any[], id: string): any => {
  for (const s of sections) {
    if (s.id === id) return s
    if (s.children) {
      const found = findSection(s.children, id)
      if (found) return found
    }
  }
  return null
}

const updateOutline = () => {
  // 直接更新，因为 currentSection 是引用
}

const handleDrop = () => {
  // 拖拽后自动更新
}

const addSection = () => {
  const newId = `section-${Date.now()}`
  const newSection = {
    id: newId,
    label: `${outlineData.value.length + 1}. 新章节`,
    type: 'personal',
    required: false,
    fields: []
  }
  outlineData.value.push(newSection)
  activeSection.value = newId
  currentSection.value = newSection
}

const addSubSection = () => {
  if (!currentSection.value.children) {
    currentSection.value.children = []
  }
  const newId = `subsection-${Date.now()}`
  const parentLabel = currentSection.value.label
  const num = currentSection.value.children.length + 1
  const newSection = {
    id: newId,
    label: `${parentLabel}.${num} 新子章节`,
    type: 'personal',
    required: false,
    fields: []
  }
  currentSection.value.children.push(newSection)
  activeSection.value = newId
  currentSection.value = newSection
}

const editSectionName = (data: any) => {
  editingSectionData.value = data
  editingSectionName.value = data.label
  sectionNameDialogVisible.value = true
}

const confirmSectionName = () => {
  if (editingSectionData.value) {
    editingSectionData.value.label = editingSectionName.value
  }
  sectionNameDialogVisible.value = false
}

const deleteSection = (data: any) => {
  ElMessageBox.confirm('确定删除此章节吗？', '删除确认', { type: 'warning' })
    .then(() => {
      const removeFromArray = (arr: any[]) => {
        const index = arr.findIndex(s => s.id === data.id)
        if (index !== -1) {
          arr.splice(index, 1)
          return true
        }
        for (const s of arr) {
          if (s.children && removeFromArray(s.children)) return true
        }
        return false
      }
      removeFromArray(outlineData.value)
      if (activeSection.value === data.id) {
        activeSection.value = ''
        currentSection.value = {}
      }
      ElMessage.success('章节已删除')
    }).catch(() => {})
}

const addField = () => {
  if (!currentSection.value.fields) {
    currentSection.value.fields = []
  }
  currentSection.value.fields.push({ name: '', type: 'text', placeholder: '' })
}

const removeField = (index: number) => {
  currentSection.value.fields.splice(index, 1)
}

const saveFrame = async () => {
  if (!frameInfo.value.name) {
    ElMessage.warning('请输入框架名称')
    return
  }
  saving.value = true
  try {
    const content = { sections: outlineData.value }
    if (frameInfo.value.id) {
      await updateFrame(frameInfo.value.id, {
        name: frameInfo.value.name,
        type: frameInfo.value.type,
        is_public: frameInfo.value.is_public ? 1 : 0,
        description: frameInfo.value.description,
        content
      })
      ElMessage.success('框架已保存')
    } else {
      const fd = new FormData()
      fd.append('name', frameInfo.value.name)
      fd.append('type', frameInfo.value.type)
      fd.append('is_public', frameInfo.value.is_public ? '1' : '0')
      fd.append('description', frameInfo.value.description)
      fd.append('content', JSON.stringify(content))
      await createFrame(fd)
      ElMessage.success('框架已创建')
    }
    router.push('/')
  } catch (e) {
    console.error('Save frame error:', e)
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push('/')
}

watch(() => frameInfo.value.type, (newType) => {
  if (!frameInfo.value.id) {
    outlineData.value = JSON.parse(JSON.stringify(defaultOutlines[newType] || defaultOutlines.ship))
  }
})

onMounted(() => {
  loadFrame()
})
</script>

<style scoped lang="scss">
.frame-edit { height: calc(100vh - 64px); display: flex; flex-direction: column; background: #f5f7fa; }
.frame-header { display: flex; justify-content: space-between; padding: 16px 24px; background: white; border-bottom: 1px solid #e4e7ed; }
.frame-title-input { font-size: 18px; font-weight: 600; border: none; border-bottom: 1px solid #dcdfe6; &:focus { border-color: #409eff; } }
.frame-meta { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
.edit-area { flex: 1; display: flex; overflow: hidden; }
.outline-panel { width: 300px; background: white; border-right: 1px solid #e4e7ed; overflow-y: auto; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #e4e7ed; }
.outline-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; }
.outline-item:hover { background: #f5f7fa; }
.outline-item.active { background: #ecf5ff; color: #409eff; }
.outline-label { flex: 1; }
.outline-actions { display: flex; gap: 4px; }
.content-panel { flex: 1; padding: 24px; overflow-y: auto; }
.section-edit { background: white; padding: 24px; border-radius: 8px; }
.fields-config { width: 100%; }
.fields-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.field-item { display: flex; align-items: center; gap: 8px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; background: white; border-radius: 8px; }
.empty-icon { font-size: 48px; color: #c0c4cc; }
</style>