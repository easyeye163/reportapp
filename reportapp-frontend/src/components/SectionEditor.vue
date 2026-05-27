<template>
  <div class="section-editor">
    <div class="section-header">
      <div class="section-icon" :class="sectionInfo?.type === 'common' ? 'common' : 'personal'"></div>
      <h3 class="section-title">{{ sectionInfo?.label || '章节内容' }}</h3>
      <el-tag :type="sectionInfo?.type === 'common' ? 'success' : 'info'" size="small">{{ sectionInfo?.type === 'common' ? '共性模块' : '个性模块' }}</el-tag>
    </div>

    <el-card class="content-card">
      <!-- 1. 报告前言 -->
      <div v-if="sectionId === 'intro'">
        <el-form label-width="100px">
          <el-form-item label="报告前言">
            <el-input v-model="localData.intro" type="textarea" rows="6" placeholder="请输入报告前言，包括报告编制目的、背景等" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 2. 项目概况 -->
      <div v-if="sectionId === 'overview'">
        <el-form label-width="120px">
          <el-divider content-position="left">基本信息</el-divider>
          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="项目名称">
                <el-input v-model="localData.projectName" placeholder="请输入项目名称" @input="emitUpdate" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="项目地点">
                <el-input v-model="localData.projectLocation" placeholder="请输入项目地点" @input="emitUpdate" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="委托单位">
                <el-input v-model="localData.clientName" placeholder="请输入委托单位" @input="emitUpdate" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left" v-if="reportType === 'ship'">船舶信息</el-divider>
          <el-row :gutter="24" v-if="reportType === 'ship'">
            <el-col :span="6">
              <el-form-item label="船舶名称">
                <el-input v-model="localData.shipName" placeholder="请输入船舶名称" @input="emitUpdate" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="船舶类型">
                <el-input v-model="localData.shipType" placeholder="请输入船舶类型" @input="emitUpdate" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="建造日期">
                <el-date-picker v-model="localData.buildDate" type="date" placeholder="选择日期" style="width:100%" @change="emitUpdate" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="总吨位">
                <el-input-number v-model="localData.tonnage" :min="0" placeholder="吨位" style="width:100%" @change="emitUpdate" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">项目描述</el-divider>
          <el-form-item label="项目背景">
            <el-input v-model="localData.projectBackground" type="textarea" rows="4" placeholder="请详细描述项目背景" @input="emitUpdate" />
          </el-form-item>
          <el-form-item label="勘验目的">
            <el-input v-model="localData.inspectionPurpose" type="textarea" rows="4" placeholder="请详细描述勘验/监测/评估目的" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 3. 编制依据 -->
      <div v-if="sectionId === 'basis'">
        <el-form label-width="100px">
          <el-form-item label="编制依据">
            <el-input v-model="localData.basis" type="textarea" rows="8" placeholder="请输入编制依据，包括相关法规、标准、规范等" @input="emitUpdate" />
          </el-form-item>
          <el-form-item label="参考标准">
            <el-select v-model="localData.standards" multiple placeholder="选择相关标准" style="width:100%" @change="emitUpdate">
              <el-option label="船舶检验规范 GB/T 35214" value="gb35214" />
              <el-option label="港口工程质量检验标准 JTS 257" value="jts257" />
              <el-option label="航道通航条件评价规范" value="channel" />
              <el-option label="环境影响评价技术导则" value="hj2.1" />
              <el-option label="水土保持监测技术规程" value="water" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <!-- 4.x 勘验内容子章节 -->
      <div v-if="['hull', 'engine', 'electrical', 'safety'].includes(sectionId)">
        <el-form label-width="100px">
          <el-form-item :label="getLabelName(sectionId)">
            <el-input v-model="localData[sectionId]" type="textarea" rows="10" :placeholder="getPlaceholder(sectionId)" @input="emitUpdate" />
          </el-form-item>
          <el-form-item label="检查结果">
            <el-radio-group v-model="localData[sectionId + 'Result']" @change="emitUpdate">
              <el-radio label="normal">正常</el-radio>
              <el-radio label="minor">轻微缺陷</el-radio>
              <el-radio label="major">重大缺陷</el-radio>
              <el-radio label="critical">严重缺陷</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="整改建议" v-if="localData[sectionId + 'Result'] !== 'normal'">
            <el-input v-model="localData[sectionId + 'Suggestion']" type="textarea" rows="3" placeholder="请输入整改建议" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 4.x 监测内容 -->
      <div v-if="['monitoring-scope', 'monitoring-method', 'monitoring-result'].includes(sectionId)">
        <el-form label-width="100px">
          <el-form-item :label="getLabelName(sectionId)">
            <el-input v-model="localData[getMonitoringKey(sectionId)]" type="textarea" rows="10" :placeholder="getPlaceholder(sectionId)" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 4.x 工程内容 -->
      <div v-if="['engineering-scope', 'engineering-quality', 'engineering-safety'].includes(sectionId)">
        <el-form label-width="100px">
          <el-form-item :label="getLabelName(sectionId)">
            <el-input v-model="localData[getEngineeringKey(sectionId)]" type="textarea" rows="10" :placeholder="getPlaceholder(sectionId)" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 4.x 环境影响 -->
      <div v-if="['env-water', 'env-eco', 'env-mitigation'].includes(sectionId)">
        <el-form label-width="100px">
          <el-form-item :label="getLabelName(sectionId)">
            <el-input v-model="localData[getEnvKey(sectionId)]" type="textarea" rows="10" :placeholder="getPlaceholder(sectionId)" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 4.x 通航条件 -->
      <div v-if="['nav-depth', 'nav-width', 'nav-safety'].includes(sectionId)">
        <el-form label-width="100px">
          <el-form-item :label="getLabelName(sectionId)">
            <el-input v-model="localData[getNavKey(sectionId)]" type="textarea" rows="10" :placeholder="getPlaceholder(sectionId)" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 4. 勘验内容主章节 -->
      <div v-if="sectionId === 'inspection' || sectionId === 'monitoring' || sectionId === 'engineering' || sectionId === 'environment' || sectionId === 'navigation'">
        <div class="section-summary">
          <el-alert type="info" :closable="false">
            <template #title>请从左侧子章节开始编辑详细内容</template>
          </el-alert>
          <el-divider />
          <el-form label-width="100px">
            <el-form-item label="内容概述">
              <el-input v-model="localData[sectionId + 'Summary']" type="textarea" rows="4" placeholder="请输入本章节内容概述" @input="emitUpdate" />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 5. 现场照片 -->
      <div v-if="sectionId === 'photos'">
        <el-upload
          action="#"
          :auto-upload="false"
          :on-change="handleImageSelect"
          :file-list="imageList"
          :limit="9"
          multiple
          accept=".jpg,.jpeg,.png"
          list-type="picture-card"
        >
          <el-icon><Plus /></el-icon>
          <template #tip>
            <div class="upload-tip">支持 jpg、png 格式，最多上传 9 张</div>
          </template>
        </el-upload>
        <div class="image-grid" v-if="imageList.length > 0">
          <div v-for="(img, index) in imageList" :key="img.id || index" class="image-item">
            <el-image :src="img.url" :preview-src-list="imageList.map(i => i.url)" fit="cover" class="image-preview" />
            <div class="image-info">
              <el-input v-model="img.description" placeholder="图片描述" size="small" @input="emitUpdate" />
            </div>
            <el-button type="danger" size="small" class="delete-btn" @click="handleDeleteImage(img.id)"><el-icon><Delete /></el-icon>删除</el-button>
          </div>
        </div>
      </div>

      <!-- 6. 分析结论 -->
      <div v-if="sectionId === 'conclusion'">
        <el-form label-width="100px">
          <el-form-item label="勘验结论">
            <el-input v-model="localData.conclusion" type="textarea" rows="6" placeholder="请输入勘验/监测/评估结论" @input="emitUpdate" />
          </el-form-item>
          <el-form-item label="综合评价">
            <el-radio-group v-model="localData.overallEvaluation" @change="emitUpdate">
              <el-radio label="qualified">合格</el-radio>
              <el-radio label="qualified-with-condition">条件合格</el-radio>
              <el-radio label="unqualified">不合格</el-radio>
              <el-radio label="need-review">需要复核</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="建议措施">
            <el-input v-model="localData.recommendations" type="textarea" rows="6" placeholder="请输入建议措施和后续工作建议" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 7. 附录 -->
      <div v-if="sectionId === 'appendix'">
        <el-form label-width="100px">
          <el-form-item label="附录内容">
            <el-input v-model="localData.appendix" type="textarea" rows="8" placeholder="请输入附录内容，包括参考资料、数据表格等" @input="emitUpdate" />
          </el-form-item>
          <el-form-item label="附件清单">
            <el-input v-model="localData.attachmentList" type="textarea" rows="4" placeholder="请列出附件清单" @input="emitUpdate" />
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  sectionId: string
  sectionInfo: any
  reportType: string
  formData: Record<string, any>
  imageList: any[]
}>()

const emit = defineEmits<{
  (e: 'update', data: any): void
  (e: 'upload-image', file: any): void
  (e: 'delete-image', imageId: number): void
}>()

const localData = ref<Record<string, any>>({})

const syncFromProps = () => {
  if (!props.formData) return
  Object.keys(props.formData).forEach(key => {
    localData.value[key] = props.formData[key]
  })
}

watch(() => props.sectionId, () => {
  syncFromProps()
}, { immediate: true })

watch(() => props.formData, () => {
  syncFromProps()
}, { deep: true })

const emitUpdate = () => {
  emit('update', localData.value)
}

const getLabelName = (id: string) => {
  const labels: Record<string, string> = {
    'hull': '船体结构检查',
    'engine': '轮机设备检查',
    'electrical': '电气设备检查',
    'safety': '安全设备检查',
    'monitoring-scope': '监测范围',
    'monitoring-method': '监测方法',
    'monitoring-result': '监测结果',
    'engineering-scope': '工程范围',
    'engineering-quality': '工程质量',
    'engineering-safety': '安全评估',
    'env-water': '水环境影响',
    'env-eco': '生态影响',
    'env-mitigation': '缓解措施',
    'nav-depth': '航道深度',
    'nav-width': '航道宽度',
    'nav-safety': '通航安全'
  }
  return labels[id] || '检查内容'
}

const getPlaceholder = (id: string) => {
  const placeholders: Record<string, string> = {
    'hull': '请详细描述船体结构检查情况，包括船体外观、腐蚀情况、焊缝质量等',
    'engine': '请详细描述轮机设备检查情况，包括主机、辅机、泵类设备等',
    'electrical': '请详细描述电气设备检查情况，包括电气系统、导航设备、通讯设备等',
    'safety': '请详细描述安全设备检查情况，包括消防设备、救生设备、报警系统等',
    'monitoring-scope': '请详细描述监测范围，包括监测点位、监测项目等',
    'monitoring-method': '请详细描述监测方法，包括监测频次、监测技术等',
    'monitoring-result': '请详细描述监测结果，包括数据分析、趋势判断等',
    'engineering-scope': '请详细描述工程范围，包括工程内容、工程量等',
    'engineering-quality': '请详细描述工程质量评估，包括质量检测结果、质量评定等',
    'engineering-safety': '请详细描述安全评估，包括安全隐患、安全措施等',
    'env-water': '请详细描述水环境影响分析',
    'env-eco': '请详细描述生态环境影响分析',
    'env-mitigation': '请详细描述环境影响缓解措施',
    'nav-depth': '请详细描述航道深度测量结果',
    'nav-width': '请详细描述航道宽度测量结果',
    'nav-safety': '请详细描述通航安全评估'
  }
  return placeholders[id] || '请输入详细内容'
}

const getMonitoringKey = (id: string) => {
  const keys: Record<string, string> = {
    'monitoring-scope': 'monitoringScope',
    'monitoring-method': 'monitoringMethod',
    'monitoring-result': 'monitoringResult'
  }
  return keys[id] || id
}

const getEngineeringKey = (id: string) => {
  const keys: Record<string, string> = {
    'engineering-scope': 'engineeringScope',
    'engineering-quality': 'engineeringQuality',
    'engineering-safety': 'engineeringSafety'
  }
  return keys[id] || id
}

const getEnvKey = (id: string) => {
  const keys: Record<string, string> = {
    'env-water': 'envWater',
    'env-eco': 'envEco',
    'env-mitigation': 'envMitigation'
  }
  return keys[id] || id
}

const getNavKey = (id: string) => {
  const keys: Record<string, string> = {
    'nav-depth': 'navDepth',
    'nav-width': 'navWidth',
    'nav-safety': 'navSafety'
  }
  return keys[id] || id
}

const handleImageSelect = (file: any) => {
  emit('upload-image', file)
}

const handleDeleteImage = (imageId: number) => {
  emit('delete-image', imageId)
}
</script>

<style scoped lang="scss">
.section-editor { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.section-header { display: flex; align-items: center; margin-bottom: 16px; }
.section-icon { width: 10px; height: 10px; border-radius: 50%; margin-right: 12px; }
.section-icon.common { background: #67c23a; }
.section-icon.personal { background: #409eff; }
.section-title { font-size: 18px; font-weight: 600; margin-right: 12px; }
.content-card { position: relative; }
.content-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #409eff, #67c23a); }
.section-summary { padding: 16px; }
.upload-tip { font-size: 12px; color: #909399; margin-top: 8px; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
.image-item { position: relative; border: 1px solid #e4e7ed; border-radius: 8px; overflow: hidden; }
.image-preview { width: 100%; height: 150px; }
.image-info { padding: 8px; }
.delete-btn { position: absolute; top: 8px; right: 8px; }
</style>