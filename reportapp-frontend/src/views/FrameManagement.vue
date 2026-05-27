<template>
  <div class="frame-management" v-loading="loading">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">框架管理</h2>
      <el-button type="primary" @click="openUploadModal">
        <el-icon><Plus /></el-icon>
        上传报告模板
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filter">
      <el-row :gutter="24" class="filter-row">
        <el-col :span="24">
          <el-input v-model="searchQuery" placeholder="搜索框架名称..." prefix-icon="Search" @input="handleSearch" />
        </el-col>
      </el-row>
      <el-row :gutter="24" class="filter-row">
        <el-col :span="10">
          <el-select v-model="filterType" placeholder="所有报告类型" @change="loadFrames">
            <el-option label="所有报告类型" value="" />
            <el-option label="船舶勘验报告" value="ship" />
            <el-option label="水土保持监测报告" value="water" />
            <el-option label="港口工程报告" value="port" />
            <el-option label="海洋环境影响评价报告" value="ocean" />
            <el-option label="航道通航条件影响评价报告" value="channel" />
          </el-select>
        </el-col>
        <el-col :span="10">
          <el-input v-model="filterCreator" placeholder="所有上传人" @input="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadFrames"><el-icon><Filter /></el-icon>筛选</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 框架列表 -->
    <div class="frame-list">
      <el-row :gutter="20">
        <el-col :span="8" v-for="frame in filteredFrames" :key="frame.id">
          <el-card class="frame-card" hover>
            <template #header>
              <div class="flex justify-between items-center">
                <h3 class="font-medium">{{ frame.name }}</h3>
                <el-tag :type="frame.isPublic ? 'success' : 'info'">{{ frame.isPublic ? '公共框架' : '个人框架' }}</el-tag>
              </div>
            </template>
            <div class="frame-info">
              <p class="text-gray-600 text-sm mb-4">{{ frame.description }}</p>
              <div class="flex justify-between text-xs text-gray-500 mb-4">
                <span><el-icon><User /></el-icon> {{ frame.creator }}</span>
                <span><el-icon><Calendar /></el-icon> {{ frame.createDate }}</span>
              </div>
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="editFrame(frame)" class="action-button">
                  <el-icon><Edit /></el-icon><span class="button-text">编辑</span>
                </el-button>
                <el-button size="small" @click="handleCopyFrame(frame)" class="action-button">
                  <el-icon><DocumentCopy /></el-icon><span class="button-text">复制</span>
                </el-button>
                <el-button size="small" type="danger" @click="handleDeleteFrame(frame)" class="action-button">
                  <el-icon><Delete /></el-icon><span class="button-text">删除</span>
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="add-frame-card" hover>
            <div class="flex flex-col items-center justify-center h-60 border-2 border-dashed border-gray-300 rounded-lg">
              <el-icon class="text-4xl text-gray-400 mb-4"><CirclePlus /></el-icon>
              <p class="text-gray-500 mb-2">创建新框架</p>
              <el-button type="primary" @click="openUploadModal"><el-icon><Upload /></el-icon>上传模板</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage" v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper"
        :total="total" @size-change="handleSizeChange" @current-change="handleCurrentChange"
      />
    </div>

    <!-- 上传模板模态框 -->
    <el-dialog v-model="uploadModalVisible" title="上传报告模板" width="500px">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="选择文件">
          <el-upload class="upload-demo" action="#" :auto-upload="false" :on-change="handleFileChange" :file-list="fileList" accept=".doc,.docx,.pdf" :limit="1">
            <el-button type="primary"><el-icon><Upload /></el-icon>选择文件</el-button>
            <template #tip><div class="el-upload__tip">支持 doc、docx、pdf 格式，单个文件不超过 500M</div></template>
          </el-upload>
        </el-form-item>
        <el-form-item label="框架名称">
          <el-input v-model="uploadForm.name" placeholder="请输入框架名称" />
        </el-form-item>
        <el-form-item label="报告类型">
          <el-select v-model="uploadForm.type" placeholder="请选择报告类型">
            <el-option label="船舶勘验报告" value="ship" />
            <el-option label="水土保持监测报告" value="water" />
            <el-option label="港口工程报告" value="port" />
            <el-option label="海洋环境影响评价报告" value="ocean" />
            <el-option label="航道通航条件影响评价报告" value="channel" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="uploadForm.description" type="textarea" rows="3" placeholder="请输入备注信息（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadModalVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitUpload">上传</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑框架模态框 -->
    <el-dialog v-model="editModalVisible" title="编辑框架" width="500px" @close="resetEditForm">
      <el-form :model="editForm" label-width="80px" :rules="editRules" ref="editFormRef">
        <el-form-item label="框架名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入框架名称" />
        </el-form-item>
        <el-form-item label="报告类型" prop="type">
          <el-select v-model="editForm.type" placeholder="请选择报告类型" style="width: 100%">
            <el-option label="船舶勘验报告" value="ship" />
            <el-option label="水土保持监测报告" value="water" />
            <el-option label="港口工程报告" value="port" />
            <el-option label="海洋环境影响评价报告" value="ocean" />
            <el-option label="航道通航条件影响评价报告" value="channel" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否公开">
          <el-switch v-model="editForm.isPublic" active-text="公共框架" inactive-text="个人框架" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.description" type="textarea" rows="3" placeholder="请输入备注信息（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editModalVisible = false">取消</el-button>
          <el-button type="primary" :loading="editSubmitting" @click="submitEdit">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Filter, User, Calendar, Edit, DocumentCopy, Delete, Upload, CirclePlus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getFrames, createFrame, updateFrame, deleteFrame, copyFrame } from '../api/frames'

const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const frames = ref<any[]>([])
const total = ref(0)
const searchQuery = ref('')
const filterType = ref('')
const filterCreator = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const uploadModalVisible = ref(false)
const uploadForm = ref({ name: '', type: '', description: '' })
const fileList = ref<any[]>([])

const editModalVisible = ref(false)
const editSubmitting = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = ref({ id: 0, name: '', type: '', description: '', isPublic: true })
const editRules = ref<FormRules>({
  name: [{ required: true, message: '请输入框架名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择报告类型', trigger: 'change' }]
})

const filteredFrames = computed(() => {
  let result = frames.value
  if (searchQuery.value) result = result.filter(f => f.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || (f.description || '').toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (filterType.value) result = result.filter(f => f.type === filterType.value)
  if (filterCreator.value) result = result.filter(f => (f.creator || '').includes(filterCreator.value))
  return result
})

const loadFrames = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: pageSize.value }
    if (searchQuery.value) params.search = searchQuery.value
    if (filterType.value) params.type = filterType.value
    const res: any = await getFrames(params)
    frames.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {} finally { loading.value = false }
}

const handleSearch = () => { currentPage.value = 1; loadFrames() }
const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1; loadFrames() }
const handleCurrentChange = (p: number) => { currentPage.value = p; loadFrames() }

const openUploadModal = () => { uploadForm.value = { name: '', type: '', description: '' }; fileList.value = []; uploadModalVisible.value = true }
const handleFileChange = (file: any) => { fileList.value = [file] }

const submitUpload = async () => {
  if (!uploadForm.value.name) { ElMessage.warning('请输入框架名称'); return }
  if (!uploadForm.value.type) { ElMessage.warning('请选择报告类型'); return }
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('name', uploadForm.value.name)
    fd.append('type', uploadForm.value.type)
    fd.append('description', uploadForm.value.description)
    if (fileList.value.length > 0) fd.append('file', fileList.value[0].raw)
    await createFrame(fd)
    ElMessage.success('框架上传成功')
    uploadModalVisible.value = false
    loadFrames()
  } catch (e) {} finally { submitting.value = false }
}

const editFrame = (frame: any) => {
  router.push({ path: '/frame-edit', query: { id: String(frame.id) } })
}

const resetEditForm = () => {
  editFormRef.value?.resetFields()
}

const submitEdit = async () => {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    editSubmitting.value = true
    try {
      const fd = new FormData()
      fd.append('name', editForm.value.name)
      fd.append('type', editForm.value.type)
      fd.append('description', editForm.value.description)
      fd.append('is_public', editForm.value.isPublic ? '1' : '0')
      await updateFrame(editForm.value.id, fd)
      ElMessage.success('框架更新成功')
      editModalVisible.value = false
      loadFrames()
    } catch (e) {} finally { editSubmitting.value = false }
  })
}

const handleCopyFrame = async (frame: any) => {
  try { await copyFrame(frame.id); ElMessage.success('框架已复制'); loadFrames() } catch (e) {}
}

const handleDeleteFrame = (frame: any) => {
  ElMessageBox.confirm('确定要删除此框架吗？', '删除确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    .then(async () => { try { await deleteFrame(frame.id); ElMessage.success('框架已删除'); loadFrames() } catch (e) {} }).catch(() => {})
}

onMounted(() => { loadFrames() })
</script>

<style scoped lang="scss">
.frame-management { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.search-filter { margin-top: 24px; margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); .filter-row { margin-bottom: 16px; align-items: center; &:last-child { margin-bottom: 0; } } .el-select { min-width: 140px; } .el-input { min-width: 200px; } }
.frame-list { margin-bottom: 24px; }
.frame-card { margin-bottom: 20px; height: 280px; display: flex; flex-direction: column; transition: all 0.3s ease; &:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(10, 61, 98, 0.15); } .frame-info { flex: 1; display: flex; flex-direction: column; gap: 12px; p { margin: 0; } .action-buttons { margin-top: auto; margin-top: 16px; } } }
.add-frame-card { margin-bottom: 20px; height: 280px; border: none; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.action-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; width: 100%; margin-top: 16px; }
.action-button { flex: 1; min-width: 60px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 12px; font-size: 12px; transition: all 0.3s ease; }
.action-button:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.button-text { font-size: 12px; }
</style>