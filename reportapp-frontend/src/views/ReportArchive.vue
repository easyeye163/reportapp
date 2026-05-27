<template>
  <div class="report-archive" v-loading="loading">
    <div class="page-header"><h2 class="text-2xl font-bold text-dark">报告归档</h2></div>

    <div class="search-filter">
      <el-row :gutter="24" class="filter-row">
        <el-col :span="8"><el-input v-model="filterForm.name" placeholder="报告名称" prefix-icon="Search" /></el-col>
        <el-col :span="8"><el-input v-model="filterForm.id" placeholder="报告编号" prefix-icon="Document" /></el-col>
        <el-col :span="8"><el-input v-model="filterForm.teamMember" placeholder="团队成员" prefix-icon="User" /></el-col>
      </el-row>
      <el-row :gutter="24" class="filter-row">
        <el-col :span="20">
          <el-select v-model="filterForm.type" placeholder="所有报告类型">
            <el-option label="所有报告类型" value="" />
            <el-option label="船舶勘验报告" value="ship" />
            <el-option label="水土保持监测报告" value="water" />
            <el-option label="港口工程报告" value="port" />
            <el-option label="海洋环境影响评价报告" value="ocean" />
            <el-option label="航道通航条件影响评价报告" value="channel" />
          </el-select>
        </el-col>
        <el-col :span="4"><el-button type="primary" @click="loadArchives"><el-icon><Filter /></el-icon>筛选</el-button></el-col>
      </el-row>
    </div>

    <div class="report-list">
      <el-card>
        <el-table :data="archives" style="width: 100%">
          <el-table-column prop="name" label="报告名称" min-width="200" />
          <el-table-column prop="reportCode" label="报告编号" width="150" />
          <el-table-column prop="creator" label="编制者" width="120" />
          <el-table-column prop="typeName" label="报告类型" width="150">
            <template #default="scope"><el-tag :type="getTagType(scope.row.type)">{{ scope.row.typeName }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="createDate" label="创建时间" width="150" />
          <el-table-column prop="archiveDate" label="归档时间" width="150" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="scope">
              <div class="action-buttons">
                <el-button size="small" @click="viewReport(scope.row)" class="action-button"><el-icon><View /></el-icon><span class="button-text">查看</span></el-button>
                <el-button size="small" @click="downloadReport(scope.row)" class="action-button"><el-icon><Download /></el-icon><span class="button-text">下载</span></el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" :total="total" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Filter, View, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getArchives, downloadArchive } from '../api/archives'

const router = useRouter()

const loading = ref(false)
const archives = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterForm = ref({ name: '', id: '', teamMember: '', type: '' })

const getTagType = (type: string) => ({ ship: 'primary', water: 'success', port: 'warning', ocean: 'info', channel: 'danger' }[type] || 'default')

const loadArchives = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: pageSize.value }
    if (filterForm.value.name) params.search = filterForm.value.name
    if (filterForm.value.type) params.type = filterForm.value.type
    const res: any = await getArchives(params)
    archives.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {} finally { loading.value = false }
}

const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1; loadArchives() }
const handleCurrentChange = (p: number) => { currentPage.value = p; loadArchives() }

const viewReport = (report: any) => { router.push({ path: '/report-edit', query: { id: report.id, mode: 'view' } }) }

const downloadReport = async (report: any) => {
  try {
    const res: any = await downloadArchive(report.id)
    const blob = new Blob([res], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.name || 'archive'}.zip`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('报告下载成功')
  } catch (e) {}
}

onMounted(() => { loadArchives() })
</script>

<style scoped lang="scss">
.report-archive { padding: 24px; }
.page-header { margin-bottom: 24px; }
.search-filter { margin-top: 24px; margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); .filter-row { margin-bottom: 16px; &:last-child { margin-bottom: 0; } } }
.report-list { margin-bottom: 24px; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.action-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; width: 100%; }
.action-button { flex: 1; min-width: 60px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; }
.button-text { font-size: 12px; }
</style>
