<template>
  <div class="report-preview">
    <div class="preview-header">
      <h1 class="preview-title">{{ reportInfo.name || '报告' }}</h1>
      <div class="preview-meta">
        <span>报告编号：{{ reportInfo.code }}</span>
        <span>报告类型：{{ getTypeName(reportInfo.type) }}</span>
        <span>状态：{{ getStatusText(reportInfo.status) }}</span>
      </div>
    </div>

    <el-divider />

    <div class="preview-body">
      <section class="preview-section" v-if="formData.intro">
        <h2>1. 报告前言</h2>
        <p>{{ formData.intro }}</p>
      </section>

      <section class="preview-section">
        <h2>2. 项目概况</h2>
        <div class="info-grid">
          <div class="info-item" v-if="formData.projectName">
            <span class="info-label">项目名称</span>
            <span class="info-value">{{ formData.projectName }}</span>
          </div>
          <div class="info-item" v-if="formData.projectLocation">
            <span class="info-label">项目地点</span>
            <span class="info-value">{{ formData.projectLocation }}</span>
          </div>
          <div class="info-item" v-if="formData.clientName">
            <span class="info-label">委托单位</span>
            <span class="info-value">{{ formData.clientName }}</span>
          </div>
        </div>

        <div class="info-grid" v-if="reportInfo.type === 'ship'">
          <div class="info-item" v-if="formData.shipName">
            <span class="info-label">船舶名称</span>
            <span class="info-value">{{ formData.shipName }}</span>
          </div>
          <div class="info-item" v-if="formData.shipType">
            <span class="info-label">船舶类型</span>
            <span class="info-value">{{ formData.shipType }}</span>
          </div>
          <div class="info-item" v-if="formData.buildDate">
            <span class="info-label">建造日期</span>
            <span class="info-value">{{ formatDate(formData.buildDate) }}</span>
          </div>
          <div class="info-item" v-if="formData.tonnage">
            <span class="info-label">总吨位</span>
            <span class="info-value">{{ formData.tonnage }} 吨</span>
          </div>
        </div>

        <div class="content-block" v-if="formData.projectBackground">
          <h3>项目背景</h3>
          <p>{{ formData.projectBackground }}</p>
        </div>
        <div class="content-block" v-if="formData.inspectionPurpose">
          <h3>勘验目的</h3>
          <p>{{ formData.inspectionPurpose }}</p>
        </div>
      </section>

      <section class="preview-section" v-if="formData.basis">
        <h2>3. 编制依据</h2>
        <p>{{ formData.basis }}</p>
      </section>

      <section class="preview-section">
        <h2>4. 主要内容</h2>
        
        <div class="content-block" v-if="formData.hull">
          <h3>船体结构检查</h3>
          <p>{{ formData.hull }}</p>
          <el-tag v-if="formData.hullResult" :type="getResultType(formData.hullResult)">{{ getResultText(formData.hullResult) }}</el-tag>
        </div>
        
        <div class="content-block" v-if="formData.engine">
          <h3>轮机设备检查</h3>
          <p>{{ formData.engine }}</p>
          <el-tag v-if="formData.engineResult" :type="getResultType(formData.engineResult)">{{ getResultText(formData.engineResult) }}</el-tag>
        </div>
        
        <div class="content-block" v-if="formData.electrical">
          <h3>电气设备检查</h3>
          <p>{{ formData.electrical }}</p>
          <el-tag v-if="formData.electricalResult" :type="getResultType(formData.electricalResult)">{{ getResultText(formData.electricalResult) }}</el-tag>
        </div>

        <div class="content-block" v-if="formData.monitoringScope">
          <h3>监测范围</h3>
          <p>{{ formData.monitoringScope }}</p>
        </div>
        
        <div class="content-block" v-if="formData.monitoringMethod">
          <h3>监测方法</h3>
          <p>{{ formData.monitoringMethod }}</p>
        </div>
        
        <div class="content-block" v-if="formData.monitoringResult">
          <h3>监测结果</h3>
          <p>{{ formData.monitoringResult }}</p>
        </div>

        <div class="content-block" v-if="formData.engineeringScope">
          <h3>工程范围</h3>
          <p>{{ formData.engineeringScope }}</p>
        </div>

        <div class="content-block" v-if="formData.envWater">
          <h3>水环境影响</h3>
          <p>{{ formData.envWater }}</p>
        </div>

        <div class="content-block" v-if="formData.navDepth">
          <h3>航道深度</h3>
          <p>{{ formData.navDepth }}</p>
        </div>
      </section>

      <section class="preview-section" v-if="imageList.length > 0">
        <h2>5. 现场照片</h2>
        <div class="photo-grid">
          <div v-for="img in imageList" :key="img.id" class="photo-item">
            <el-image :src="img.url" fit="cover" class="photo-image" />
            <p class="photo-desc">{{ img.description || img.name }}</p>
          </div>
        </div>
      </section>

      <section class="preview-section">
        <h2>6. 分析结论</h2>
        <div class="content-block" v-if="formData.conclusion">
          <h3>勘验结论</h3>
          <p>{{ formData.conclusion }}</p>
        </div>
        <div class="content-block" v-if="formData.overallEvaluation">
          <h3>综合评价</h3>
          <el-tag :type="getEvaluationType(formData.overallEvaluation)" size="large">{{ getEvaluationText(formData.overallEvaluation) }}</el-tag>
        </div>
        <div class="content-block" v-if="formData.recommendations">
          <h3>建议措施</h3>
          <p>{{ formData.recommendations }}</p>
        </div>
      </section>

      <section class="preview-section" v-if="formData.appendix">
        <h2>7. 附录</h2>
        <p>{{ formData.appendix }}</p>
      </section>

      <section class="preview-section" v-if="reviews.length > 0">
        <h2>审核记录</h2>
        <el-table :data="reviews" style="width: 100%">
          <el-table-column prop="reviewer_name" label="审核人" width="120" />
          <el-table-column prop="result" label="结果" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.result === 'approved' ? 'success' : 'danger'">
                {{ scope.row.result === 'approved' ? '通过' : '退回' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="comment" label="意见" />
          <el-table-column prop="created_at" label="时间" width="180" />
        </el-table>
      </section>
    </div>

    <div class="preview-footer">
      <p>导出时间：{{ new Date().toLocaleString('zh-CN') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  reportInfo: any
  formData: Record<string, any>
  imageList: any[]
  reviews: any[]
}>()

const getTypeName = (type: string) => {
  const types = { ship: '船舶勘验报告', water: '水土保持监测报告', port: '港口工程报告', ocean: '海洋环境影响评价报告', channel: '航道通航条件影响评价报告' }
  return types[type] || type
}

const getStatusText = (status: string) => {
  const statuses = { draft: '编制中', pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '已退回' }
  return statuses[status] || status
}

const formatDate = (date: any) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

const getResultType = (result: string) => {
  const types = { normal: 'success', minor: 'warning', major: 'danger', critical: 'danger' }
  return types[result] || 'info'
}

const getResultText = (result: string) => {
  const texts = { normal: '正常', minor: '轻微缺陷', major: '重大缺陷', critical: '严重缺陷' }
  return texts[result] || result
}

const getEvaluationType = (evaluation: string) => {
  const types = { qualified: 'success', 'qualified-with-condition': 'warning', unqualified: 'danger', 'need-review': 'info' }
  return types[evaluation] || 'info'
}

const getEvaluationText = (evaluation: string) => {
  const texts = { qualified: '合格', 'qualified-with-condition': '条件合格', unqualified: '不合格', 'need-review': '需要复核' }
  return texts[evaluation] || evaluation
}
</script>

<style scoped lang="scss">
.report-preview { padding: 24px; background: white; }
.preview-header { text-align: center; margin-bottom: 24px; }
.preview-title { font-size: 24px; font-weight: 600; margin-bottom: 12px; }
.preview-meta { display: flex; justify-content: center; gap: 24px; font-size: 14px; color: #606266; }
.preview-body { margin-top: 24px; }
.preview-section { margin-bottom: 32px; }
.preview-section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #409eff; }
.preview-section h3 { font-size: 16px; font-weight: 500; margin-bottom: 8px; color: #303133; }
.preview-section p { font-size: 14px; line-height: 1.8; color: #606266; margin-bottom: 12px; }
.info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
.info-item { display: flex; gap: 8px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; }
.info-label { font-size: 13px; color: #909399; }
.info-value { font-size: 13px; color: #303133; font-weight: 500; }
.content-block { margin-bottom: 16px; }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.photo-item { border: 1px solid #e4e7ed; border-radius: 8px; overflow: hidden; }
.photo-image { width: 100%; height: 150px; }
.photo-desc { font-size: 12px; color: #606266; padding: 8px; text-align: center; }
.preview-footer { text-align: right; margin-top: 24px; font-size: 12px; color: #909399; }
</style>