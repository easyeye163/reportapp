<template>
  <div class="operation-guide" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">操作指南</h2>
      <el-button type="primary" @click="openUploadModal"><el-icon><Upload /></el-icon>上传指南文件</el-button>
    </div>

    <!-- 指南列表 -->
    <div class="guide-list" v-if="guides.length > 0">
      <el-row :gutter="20">
        <el-col :span="8" v-for="guide in guides" :key="guide.id">
          <el-card class="guide-card" hover>
            <template #header>
              <div class="flex justify-between items-center">
                <h3 class="font-medium">{{ guide.name }}</h3>
                <el-tag type="info" size="small">{{ guide.type || '指南' }}</el-tag>
              </div>
            </template>
            <p class="text-gray-600 text-sm mb-4">{{ guide.description }}</p>
            <div class="flex justify-between text-xs text-gray-500 mb-4">
              <span>{{ guide.uploader || guide.creator }}</span>
              <span>{{ guide.createDate || guide.uploadDate }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 系统操作指南 -->
    <div class="guide-tabs">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="系统操作指南" name="system">
          <div class="guide-content">
            <h3 class="guide-title">系统操作指南</h3>
            <p class="guide-description">本指南详细介绍了报告编制软件的各项功能操作步骤，帮助用户快速掌握系统使用方法。</p>
            <div class="guide-section"><h4 class="section-title">1. 系统登录</h4><div class="section-content"><p>1.1 打开浏览器，输入系统网址</p><p>1.2 输入用户名和密码</p><p>1.3 点击登录按钮进入系统</p></div></div>
            <div class="guide-section"><h4 class="section-title">2. 框架管理</h4><div class="section-content"><p>2.1 点击左侧菜单的"框架管理"</p><p>2.2 点击"上传报告模板"按钮上传新模板</p><p>2.3 对现有模板进行编辑、复制、删除操作</p></div></div>
            <div class="guide-section"><h4 class="section-title">3. 报告编制</h4><div class="section-content"><p>3.1 点击左侧菜单的"报告编制"</p><p>3.2 从报告大纲中选择章节进行编辑</p><p>3.3 填写报告内容，上传相关图片</p><p>3.4 点击"保存"按钮保存报告</p><p>3.5 点击"提交审核"按钮将报告提交审核</p></div></div>
            <div class="guide-section"><h4 class="section-title">4. 审核管理</h4><div class="section-content"><p>4.1 点击左侧菜单的"审核管理"</p><p>4.2 选择待审核的报告</p><p>4.3 查看报告内容，填写审核意见</p><p>4.4 选择审核结果（通过/退回）</p><p>4.5 点击"提交审核结果"按钮完成审核</p></div></div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="报告编制审批流程" name="process">
          <div class="guide-content">
            <h3 class="guide-title">报告编制审批流程</h3>
            <p class="guide-description">本流程详细介绍了报告从编制到归档的完整流程。</p>
            <div class="process-flow">
              <div class="flow-step"><div class="step-number">1</div><div class="step-content"><h4 class="step-title">报告编制</h4><p class="step-description">工程师根据框架模板编制报告内容。</p></div></div>
              <div class="flow-arrow">→</div>
              <div class="flow-step"><div class="step-number">2</div><div class="step-content"><h4 class="step-title">提交审核</h4><p class="step-description">工程师完成报告编制后，提交审核。</p></div></div>
              <div class="flow-arrow">→</div>
              <div class="flow-step"><div class="step-number">3</div><div class="step-content"><h4 class="step-title">一级审核</h4><p class="step-description">部门主管对报告进行初步审核。</p></div></div>
              <div class="flow-arrow">→</div>
              <div class="flow-step"><div class="step-number">4</div><div class="step-content"><h4 class="step-title">二级审核</h4><p class="step-description">技术负责人对报告进行专业审核。</p></div></div>
              <div class="flow-arrow">→</div>
              <div class="flow-step"><div class="step-number">5</div><div class="step-content"><h4 class="step-title">三级审核</h4><p class="step-description">总工程师对报告进行最终审核。</p></div></div>
              <div class="flow-arrow">→</div>
              <div class="flow-step"><div class="step-number">6</div><div class="step-content"><h4 class="step-title">报告出版</h4><p class="step-description">审核通过后，导出为最终版本。</p></div></div>
              <div class="flow-arrow">→</div>
              <div class="flow-step"><div class="step-number">7</div><div class="step-content"><h4 class="step-title">报告归档</h4><p class="step-description">将最终版本的报告进行归档。</p></div></div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="常见问题" name="faq">
          <div class="guide-content">
            <h3 class="guide-title">常见问题</h3>
            <p class="guide-description">本部分解答了用户在使用系统过程中常见的问题。</p>
            <div class="faq-list">
              <el-collapse>
                <el-collapse-item title="如何上传报告模板？"><div class="faq-content"><p>1. 点击左侧菜单的"框架管理"</p><p>2. 点击页面右上角的"上传报告模板"按钮</p><p>3. 在弹出的对话框中选择要上传的文件</p><p>4. 填写框架名称、报告类型和备注信息</p><p>5. 点击"上传"按钮完成操作</p></div></el-collapse-item>
                <el-collapse-item title="如何邀请团队成员协作编制报告？"><div class="faq-content"><p>1. 进入报告编制页面</p><p>2. 在报告标题栏下方找到"团队成员"部分</p><p>3. 点击"邀请"按钮</p><p>4. 在弹出的对话框中选择要邀请的团队成员</p><p>5. 点击"确认"按钮发送邀请</p></div></el-collapse-item>
                <el-collapse-item title="如何导出带有水印的报告？"><div class="faq-content"><p>1. 进入报告出版页面</p><p>2. 选择要导出的报告</p><p>3. 点击"导出"按钮</p><p>4. 在导出设置对话框中，勾选"添加水印"选项</p><p>5. 选择水印类型和内容</p><p>6. 点击"确认导出"按钮完成操作</p></div></el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 上传指南文件模态框 -->
    <el-dialog v-model="uploadModalVisible" title="上传指南文件" width="500px">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="选择文件">
          <el-upload class="upload-demo" action="#" :auto-upload="false" :on-change="handleFileChange" :file-list="fileList" accept=".doc,.docx,.pdf,.txt" :limit="1">
            <el-button type="primary"><el-icon><Upload /></el-icon>选择文件</el-button>
            <template #tip><div class="el-upload__tip">支持 doc、docx、pdf、txt 格式</div></template>
          </el-upload>
        </el-form-item>
        <el-form-item label="文件名称"><el-input v-model="uploadForm.name" placeholder="请输入文件名称" /></el-form-item>
        <el-form-item label="文件类型">
          <el-select v-model="uploadForm.type" placeholder="请选择文件类型">
            <el-option label="报告编制规范" value="specification" />
            <el-option label="操作指南" value="guide" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="uploadForm.description" type="textarea" rows="3" placeholder="请输入备注信息（可选）" /></el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadModalVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitUpload">上传</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getGuides, createGuide } from '../api/guides'

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('system')
const guides = ref<any[]>([])
const uploadModalVisible = ref(false)
const uploadForm = ref({ name: '', type: '', description: '' })
const fileList = ref<any[]>([])

const loadGuides = async () => {
  loading.value = true
  try { const res: any = await getGuides(); guides.value = res.data?.list || res.data || [] } catch (e) {} finally { loading.value = false }
}

const openUploadModal = () => { uploadForm.value = { name: '', type: '', description: '' }; fileList.value = []; uploadModalVisible.value = true }
const handleFileChange = (file: any) => { fileList.value = [file] }

const submitUpload = async () => {
  if (!uploadForm.value.name) { ElMessage.warning('请输入文件名称'); return }
  if (!uploadForm.value.type) { ElMessage.warning('请选择文件类型'); return }
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('name', uploadForm.value.name)
    fd.append('type', uploadForm.value.type)
    fd.append('description', uploadForm.value.description)
    if (fileList.value.length > 0) fd.append('file', fileList.value[0].raw)
    await createGuide(fd)
    ElMessage.success('文件上传成功')
    uploadModalVisible.value = false
    loadGuides()
  } catch (e) {} finally { submitting.value = false }
}

onMounted(() => { loadGuides() })
</script>

<style scoped lang="scss">
.operation-guide { padding: 24px 32px; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; min-height: 60px; }
.guide-list { margin-bottom: 24px; }
.guide-card { margin-bottom: 20px; transition: all 0.3s ease; &:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(10, 61, 98, 0.15); } }
.guide-tabs { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); overflow: hidden; padding-left: 24px; }
.guide-content { padding: 24px; .guide-title { font-size: 20px; font-weight: 600; color: #0A3D62; margin-bottom: 12px; } .guide-description { font-size: 14px; color: #666; margin-bottom: 24px; line-height: 1.5; } }
.guide-section { margin-bottom: 24px; .section-title { font-size: 16px; font-weight: 500; color: #333; margin-bottom: 12px; } .section-content { font-size: 14px; color: #666; line-height: 1.6; padding-left: 20px; p { margin-bottom: 8px; } } }
.process-flow { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
.flow-step { display: flex; align-items: flex-start; gap: 16px; .step-number { width: 32px; height: 32px; border-radius: 50%; background: #0A3D62; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; } .step-content { flex: 1; .step-title { font-size: 16px; font-weight: 500; color: #333; margin-bottom: 4px; } .step-description { font-size: 14px; color: #666; line-height: 1.5; } } }
.flow-arrow { text-align: center; font-size: 20px; color: #0A3D62; font-weight: bold; margin: -10px 0; }
.faq-list { .faq-content { font-size: 14px; color: #666; line-height: 1.6; padding: 12px; p { margin-bottom: 8px; } } }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
</style>
