<template>
  <div class="onlyoffice-editor">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button @click="goBack" text>
          <el-icon><ArrowLeft /></el-icon>
          返回报告
        </el-button>
        <el-divider direction="vertical" />
        <span class="report-name">{{ reportInfo.name }}</span>
        <el-tag size="small" :type="getStatusType(reportInfo.status)">{{ getStatusText(reportInfo.status) }}</el-tag>
      </div>
      <div class="toolbar-right">
        <el-tag v-if="onlyofficeStatus === 'online'" type="success" size="small">
          <el-icon><CircleCheck /></el-icon> 在线编辑器已就绪
        </el-tag>
        <el-tag v-else-if="onlyofficeStatus === 'offline'" type="danger" size="small">
          <el-icon><Warning /></el-icon> 编辑器离线
        </el-tag>
        <el-tag v-else type="info" size="small">
          <el-icon><Loading /></el-icon> 检测中...
        </el-tag>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-container" v-loading="loading" element-loading-text="正在加载文档编辑器...">
      <!-- OnlyOffice 编辑器挂载点 -->
      <div id="onlyoffice-editor-container" ref="editorContainer" class="editor-iframe-container"></div>

      <!-- 编辑器不可用时的降级提示 -->
      <div v-if="onlyofficeStatus === 'offline' && !loading" class="editor-fallback">
        <div class="fallback-content">
          <el-icon class="fallback-icon"><Warning /></el-icon>
          <h3>OnlyOffice Document Server 未连接</h3>
          <p>在线文档编辑器暂时不可用，请确认 OnlyOffice 服务已启动。</p>
          <div class="fallback-actions">
            <el-button type="primary" @click="checkStatus">
              <el-icon><Refresh /></el-icon> 重新检测
            </el-button>
            <el-button @click="useFormEditor">
              <el-icon><Edit /></el-icon> 使用表单编辑
            </el-button>
          </div>
          <div class="fallback-guide">
            <el-divider>快速部署指南</el-divider>
            <div class="guide-steps">
              <p><strong>1. 使用 Docker 启动 OnlyOffice：</strong></p>
              <el-input type="textarea" :rows="3" readonly :model-value="dockerCommand" class="code-block" />
              <p><strong>2. 配置环境变量（可选）：</strong></p>
              <el-input type="textarea" :rows="2" readonly model-value="ONLYOFFICE_URL=http://your-server:8080" class="code-block" />
              <p><strong>3. 重启后端服务</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CircleCheck, Warning, Loading, Refresh, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '../api/request'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const onlyofficeStatus = ref<'checking' | 'online' | 'offline'>('checking')
const reportInfo = ref<any>({})
const editorContainer = ref<HTMLElement | null>(null)
let docEditor: any = null

const dockerCommand = `docker run -d --name onlyoffice \\
  -p 8080:80 \\
  -e JWT_SECRET=mySecret \\
  onlyoffice/documentserver:latest`

const getStatusType = (status: string) => ({
  draft: 'info', pending: 'warning', reviewing: 'warning',
  approved: 'success', rejected: 'danger', revise: 'warning'
}[status] || 'info')

const getStatusText = (status: string) => ({
  draft: '编制中', pending: '待审核', reviewing: '审核中',
  approved: '已通过', rejected: '已退回', revise: '修订中'
}[status] || status)

const checkStatus = async () => {
  onlyofficeStatus.value = 'checking'
  try {
    const res: any = await request.get('/onlyoffice/status')
    onlyofficeStatus.value = res.data?.available ? 'online' : 'offline'
  } catch {
    onlyofficeStatus.value = 'offline'
  }
}

const loadEditor = async () => {
  const reportId = route.query.id || 'test'

  try {
    const res: any = await request.get(`/onlyoffice/config/${reportId}`)
    const { config, documentServerUrl, report } = res.data

    reportInfo.value = report

    if (onlyofficeStatus.value !== 'online') {
      loading.value = false
      return
    }

    await loadScript(`${documentServerUrl}/web-apps/apps/api/documents/api.js`)
    await nextTick()

    // @ts-ignore
    docEditor = new DocsAPI.DocEditor('onlyoffice-editor-container', {
      ...config,
      events: {
        onReady: () => {
          loading.value = false
          console.log('OnlyOffice editor ready')
        },
        onError: (event: any) => {
          console.error('OnlyOffice error:', event)
          ElMessage.error('文档编辑器加载失败')
          loading.value = false
        }
      }
    })
  } catch (err: any) {
    console.error('Load editor error:', err)
    loading.value = false
    if (err?.response?.status === 404) {
      onlyofficeStatus.value = 'offline'
    }
  }
}

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

const goBack = () => {
  const reportId = route.query.id
  if (reportId) {
    router.push({ path: '/report-edit', query: { id: String(reportId) } })
  } else {
    router.back()
  }
}

const useFormEditor = () => {
  const reportId = route.query.id
  if (reportId) {
    router.push({ path: '/report-edit', query: { id: String(reportId) } })
  }
}

onMounted(async () => {
  await checkStatus()
  await loadEditor()
})

onBeforeUnmount(() => {
  if (docEditor) {
    try {
      docEditor.destroyEditor()
    } catch (e) {
      // ignore
    }
  }
})
</script>

<style scoped lang="scss">
.onlyoffice-editor {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  min-height: 48px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.editor-iframe-container {
  width: 100%;
  height: 100%;
}

.editor-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.fallback-content {
  text-align: center;
  max-width: 600px;
  padding: 40px;

  h3 {
    margin: 16px 0 8px;
    color: #303133;
  }

  p {
    color: #606266;
    margin-bottom: 24px;
  }
}

.fallback-icon {
  font-size: 64px;
  color: #e6a23c;
}

.fallback-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}

.fallback-guide {
  text-align: left;
  background: white;
  border-radius: 8px;
  padding: 24px;
}

.guide-steps {
  p {
    margin: 12px 0 4px;
    font-size: 14px;
  }
}

.code-block {
  :deep(textarea) {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    background: #1e1e1e;
    color: #d4d4d4;
    border: none;
  }
}
</style>
