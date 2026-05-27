<template>
  <div class="onlyoffice-embed" v-loading="loading" element-loading-text="正在加载文档编辑器...">
    <div :id="editorElementId" ref="editorContainer" class="editor-mount"></div>

    <div v-if="status === 'offline' && !loading" class="editor-fallback">
      <div class="fallback-inner">
        <el-icon class="fallback-icon"><WarningFilled /></el-icon>
        <h3>文档编辑器未连接</h3>
        <p>OnlyOffice Document Server 暂不可用，请确认服务已启动。</p>
        <el-button type="primary" @click="init">重新检测</el-button>
        <div class="fallback-guide">
          <p><strong>快速部署：</strong></p>
          <code>docker compose -f docker-compose.onlyoffice.yml up -d</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import request from '../api/request'

const props = defineProps<{
  reportId: number
}>()

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'error', msg: string): void
  (e: 'status-change', status: string): void
}>()

const loading = ref(true)
const status = ref<'checking' | 'online' | 'offline'>('checking')
const editorContainer = ref<HTMLElement | null>(null)
let docEditor: any = null

const editorElementId = computed(() => `onlyoffice-editor-${props.reportId}`)

const init = async () => {
  loading.value = true
  status.value = 'checking'
  emit('status-change', 'checking')

  // 1. Check OnlyOffice availability
  try {
    const res: any = await request.get('/onlyoffice/status')
    if (!res.data?.available) {
      status.value = 'offline'
      loading.value = false
      emit('status-change', 'offline')
      return
    }
  } catch {
    status.value = 'offline'
    loading.value = false
    emit('status-change', 'offline')
    return
  }
  status.value = 'online'
  emit('status-change', 'online')

  // 2. Load editor config
  try {
    const res: any = await request.get(`/onlyoffice/config/${props.reportId}`)
    const { config, documentServerUrl } = res.data

    // 3. Load OnlyOffice API script
    await loadScript(`${documentServerUrl}/web-apps/apps/api/documents/api.js`)

    await nextTick()

    // 4. Destroy previous instance
    if (docEditor) {
      try { docEditor.destroyEditor() } catch {}
      docEditor = null
    }

    // 5. Create editor
    // @ts-ignore
    docEditor = new DocsAPI.DocEditor(editorElementId.value, {
      ...config,
      events: {
        onReady: () => {
          loading.value = false
          emit('ready')
        },
        onError: (event: any) => {
          console.error('OnlyOffice error:', event)
          loading.value = false
          emit('error', '文档编辑器加载失败')
        }
      }
    })
  } catch (err: any) {
    console.error('Load editor error:', err)
    loading.value = false
    if (err?.response?.status === 404) {
      status.value = 'offline'
      emit('status-change', 'offline')
    } else {
      emit('error', '加载编辑器配置失败')
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
    script.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(script)
  })
}

onMounted(init)

onBeforeUnmount(() => {
  if (docEditor) {
    try { docEditor.destroyEditor() } catch {}
  }
})
</script>

<style scoped>
.onlyoffice-embed {
  width: 100%;
  height: 100%;
  position: relative;
}
.editor-mount {
  width: 100%;
  height: 100%;
}
.editor-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}
.fallback-inner {
  text-align: center;
  max-width: 480px;
  padding: 40px;
}
.fallback-icon {
  font-size: 56px;
  color: #e6a23c;
}
.fallback-inner h3 {
  margin: 16px 0 8px;
  color: #303133;
}
.fallback-inner p {
  color: #606266;
  margin-bottom: 20px;
}
.fallback-guide {
  margin-top: 24px;
  padding: 16px;
  background: #f0f2f5;
  border-radius: 8px;
  text-align: left;
}
.fallback-guide code {
  display: block;
  margin-top: 8px;
  padding: 8px 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  font-size: 13px;
}
</style>
