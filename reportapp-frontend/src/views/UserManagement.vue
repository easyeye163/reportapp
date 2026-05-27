<template>
  <div class="user-management" v-loading="loading">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">用户管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openRoleManagementModal">
          <el-icon><Setting /></el-icon>
          角色管理
        </el-button>
        <el-button type="primary" @click="openAddUserModal">
          <el-icon><Plus /></el-icon>
          新增用户
        </el-button>
      </div>
    </div>

    <!-- 组织角色框架图 -->
    <div class="organization-chart">
      <el-card>
        <template #header>
          <div class="card-header">
            <h3>组织角色框架图</h3>
            <p class="card-subtitle">实时反映组织架构，用户增减时自动更新</p>
          </div>
        </template>
        <div class="chart-container">
          <div class="org-chart">
            <div class="org-level">
              <div class="org-node chief">
                <div class="node-content">
                  <div class="node-title">总工程师</div>
                  <div class="node-count">{{ roleCounts.chief }}人</div>
                </div>
              </div>
            </div>
            <div class="org-level">
              <div class="org-node manager">
                <div class="node-content">
                  <div class="node-title">主管</div>
                  <div class="node-count">{{ roleCounts.manager }}人</div>
                </div>
              </div>
            </div>
            <div class="org-level">
              <div class="org-node engineer">
                <div class="node-content">
                  <div class="node-title">工程师</div>
                  <div class="node-count">{{ roleCounts.engineer }}人</div>
                </div>
              </div>
            </div>
            <div class="org-level">
              <div class="org-node admin">
                <div class="node-content">
                  <div class="node-title">管理员</div>
                  <div class="node-count">{{ roleCounts.admin }}人</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filter">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-input
            v-model="searchQuery"
            placeholder="搜索用户名、手机号..."
            prefix-icon="Search"
            @input="handleSearch"
          />
        </el-col>
        <el-col :span="8">
          <el-select v-model="filterRole" placeholder="所有角色" @change="loadUsers">
            <el-option label="所有角色" value="" />
            <el-option label="管理员" value="admin" />
            <el-option label="工程师" value="engineer" />
            <el-option label="主管" value="manager" />
            <el-option label="总工程师" value="chief" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="loadUsers">
            <el-icon><Filter /></el-icon>
            筛选
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 用户列表 -->
    <div class="user-list">
      <el-card>
        <el-table :data="users" style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="用户名" width="120" />
          <el-table-column prop="phone" label="手机号" width="150" />
          <el-table-column prop="role" label="角色" width="120">
            <template #default="scope">
              <el-tag :type="getRoleType(scope.row.role)">
                {{ getRoleText(scope.row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
                {{ scope.row.status === 'active' ? '活跃' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="scope">
              <div class="action-buttons">
                <el-button size="small" @click="editUser(scope.row)" class="action-button">
                  <el-icon><Edit /></el-icon>
                  <span class="button-text">编辑</span>
                </el-button>
                <el-button size="small" :type="scope.row.status === 'active' ? 'warning' : 'success'" @click="toggleStatus(scope.row)" class="action-button">
                  <el-icon v-if="scope.row.status === 'active'"><Close /></el-icon>
                  <el-icon v-else><Check /></el-icon>
                  <span class="button-text">{{ scope.row.status === 'active' ? '禁用' : '启用' }}</span>
                </el-button>
                <el-button size="small" type="danger" @click="deleteUser(scope.row)" class="action-button">
                  <el-icon><Delete /></el-icon>
                  <span class="button-text">删除</span>
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增用户模态框 -->
    <el-dialog
      v-model="addUserModalVisible"
      title="新增用户"
      width="600px"
    >
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="用户名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" @change="handleRoleChange">
            <el-option label="管理员" value="admin" />
            <el-option label="工程师" value="engineer" />
            <el-option label="主管" value="manager" />
            <el-option label="总工程师" value="chief" />
          </el-select>
        </el-form-item>
        <el-form-item label="电子签名">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-change="handleSignatureChange"
            :file-list="userForm.signature"
            accept=".jpg,.jpeg,.png"
            :limit="1"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传电子签名
            </el-button>
            <template #tip>
              <div class="el-upload__tip">支持 jpg、jpeg、png 格式</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="userForm.role === 'chief'" label="电子章">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-change="handleSealChange"
            :file-list="userForm.seal"
            accept=".jpg,.jpeg,.png"
            :limit="1"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传电子章
            </el-button>
            <template #tip>
              <div class="el-upload__tip">支持 jpg、jpeg、png 格式</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addUserModalVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitAddUser">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑用户模态框 -->
    <el-dialog
      v-model="editUserModalVisible"
      title="编辑用户"
      width="600px"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="editForm.name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="工程师" value="engineer" />
            <el-option label="主管" value="manager" />
            <el-option label="总工程师" value="chief" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editUserModalVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitEditUser">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 角色管理模态框 -->
    <el-dialog
      v-model="roleManagementModalVisible"
      title="角色管理"
      width="600px"
    >
      <el-form :model="roleForm" label-width="100px">
        <el-form-item label="选择角色">
          <el-select v-model="selectedRoleId" placeholder="请选择角色" @change="onRoleSelect" style="width: 100%">
            <el-option v-for="role in rolesList" :key="role.id" :label="role.name + ' — ' + (role.description || '')" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input v-model="roleForm.description" type="textarea" rows="3" placeholder="请输入角色描述" />
        </el-form-item>
        <el-form-item label="角色权限">
          <el-checkbox-group v-model="roleForm.permissions">
            <el-checkbox label="user:manage">用户管理</el-checkbox>
            <el-checkbox label="report:create">报告编制</el-checkbox>
            <el-checkbox label="report:review">报告审核</el-checkbox>
            <el-checkbox label="report:publish">报告出版</el-checkbox>
            <el-checkbox label="report:archive">报告归档</el-checkbox>
            <el-checkbox label="frame:manage">框架管理</el-checkbox>
            <el-checkbox label="case:manage">案例库管理</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleManagementModalVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRoleManagement">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Filter, Edit, Delete, Check, Close, Setting, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, createUser, updateUser, updateUserStatus, deleteUser, getRoles, updateRole } from '../api/users'

const loading = ref(false)
const submitting = ref(false)
const users = ref<any[]>([])
const total = ref(0)
const searchQuery = ref('')
const filterRole = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 新增用户模态框
const addUserModalVisible = ref(false)
const userForm = ref({
  name: '', phone: '', password: '', role: '', signature: [] as any[], seal: [] as any[]
})

// 编辑用户模态框
const editUserModalVisible = ref(false)
const editForm = ref({ id: 0, name: '', role: '' })

// 角色管理模态框
const roleManagementModalVisible = ref(false)
const roleForm = ref({ id: 0, name: '', description: '', permissions: [] as string[] })
const rolesList = ref<any[]>([])
const selectedRoleId = ref(0)

const loadRoles = async () => {
  try {
    const res: any = await getRoles()
    rolesList.value = res.data || []
  } catch (e) { /* handled */ }
}

const openRoleManagementModal = async () => {
  await loadRoles()
  if (rolesList.value.length > 0) {
    const firstRole = rolesList.value[0]
    selectedRoleId.value = firstRole.id
    roleForm.value = { id: firstRole.id, name: firstRole.name, description: firstRole.description || '', permissions: firstRole.permissions || [] }
  } else {
    roleForm.value = { id: 0, name: '', description: '', permissions: [] }
  }
  roleManagementModalVisible.value = true
}

const onRoleSelect = (roleId: number) => {
  const role = rolesList.value.find((r: any) => r.id === roleId)
  if (role) {
    selectedRoleId.value = role.id
    roleForm.value = { id: role.id, name: role.name, description: role.description || '', permissions: role.permissions || [] }
  }
}

const submitRoleManagement = async () => {
  if (!roleForm.value.id) { ElMessage.warning('请先选择角色'); return }
  if (!roleForm.value.name) { ElMessage.warning('请输入角色名称'); return }
  try {
    await updateRole(roleForm.value.id, { name: roleForm.value.name, description: roleForm.value.description, permissions: roleForm.value.permissions })
    ElMessage.success('角色设置已保存')
    roleManagementModalVisible.value = false
  } catch (e) { /* handled */ }
}

// 角色计数
const roleCounts = computed(() => ({
  admin: users.value.filter(u => u.role === 'admin').length,
  engineer: users.value.filter(u => u.role === 'engineer').length,
  manager: users.value.filter(u => u.role === 'manager').length,
  chief: users.value.filter(u => u.role === 'chief').length
}))

const getRoleType = (role: string) => ({ admin: 'danger', engineer: 'primary', manager: 'warning', chief: 'success' }[role] || 'default')
const getRoleText = (role: string) => ({ admin: '管理员', engineer: '工程师', manager: '主管', chief: '总工程师' }[role] || '未知')

const loadUsers = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: pageSize.value }
    if (searchQuery.value) params.search = searchQuery.value
    if (filterRole.value) params.role = filterRole.value
    const res: any = await getUsers(params)
    users.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) { /* handled */ } finally { loading.value = false }
}

const handleSearch = () => { currentPage.value = 1; loadUsers() }
const handleSizeChange = (size: number) => { pageSize.value = size; currentPage.value = 1; loadUsers() }
const handleCurrentChange = (page: number) => { currentPage.value = page; loadUsers() }

const openAddUserModal = () => {
  userForm.value = { name: '', phone: '', password: '', role: '', signature: [], seal: [] }
  addUserModalVisible.value = true
}
const handleRoleChange = () => { if (userForm.value.role !== 'chief') userForm.value.seal = [] }
const handleSignatureChange = (file: any) => { userForm.value.signature = [file] }
const handleSealChange = (file: any) => { userForm.value.seal = [file] }

const submitAddUser = async () => {
  if (!userForm.value.name) { ElMessage.warning('请输入用户名'); return }
  if (!userForm.value.phone) { ElMessage.warning('请输入手机号'); return }
  if (!userForm.value.password) { ElMessage.warning('请输入密码'); return }
  if (!userForm.value.role) { ElMessage.warning('请选择角色'); return }
  submitting.value = true
  try {
    await createUser(userForm.value)
    ElMessage.success('用户添加成功')
    addUserModalVisible.value = false
    loadUsers()
  } catch (e) { /* handled */ } finally { submitting.value = false }
}

const editUser = (user: any) => {
  editForm.value = { id: user.id, name: user.name, role: user.role }
  editUserModalVisible.value = true
}

const submitEditUser = async () => {
  submitting.value = true
  try {
    await updateUser(editForm.value.id, editForm.value)
    ElMessage.success('用户更新成功')
    editUserModalVisible.value = false
    loadUsers()
  } catch (e) { /* handled */ } finally { submitting.value = false }
}

const toggleStatus = async (user: any) => {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  try {
    await updateUserStatus(user.id, newStatus)
    ElMessage.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`)
    loadUsers()
  } catch (e) { /* handled */ }
}

const deleteUser = (user: any) => {
  ElMessageBox.confirm('确定要删除此用户吗？', '删除确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    .then(async () => {
      try { await deleteUser(user.id); ElMessage.success('用户已删除'); loadUsers() } catch (e) { /* handled */ }
    }).catch(() => {})
}

onMounted(() => { loadUsers(); loadRoles() })
</script>

<style scoped lang="scss">
.user-management { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; .header-actions { display: flex; gap: 12px; } }
.search-filter { margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); }
.user-list { margin-bottom: 24px; }
.pagination { display: flex; justify-content: center; margin-top: 24px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.action-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; width: 100%; }
.action-button { flex: 1; min-width: 60px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; font-size: 12px; }
.button-text { font-size: 12px; }
.organization-chart { margin-bottom: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header h3 { font-size: 18px; font-weight: 600; color: #333; margin: 0; }
.card-subtitle { font-size: 14px; color: #666; margin: 0; }
.chart-container { padding: 20px; }
.org-chart { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.org-level { display: flex; gap: 10px; justify-content: center; }
.org-node { padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); text-align: center; min-width: 150px; transition: all 0.3s ease; }
.org-node:hover { transform: translateY(-5px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); }
.org-node.admin { background: #fef2f2; border: 2px solid #f87171; }
.org-node.engineer { background: #eff6ff; border: 2px solid #60a5fa; }
.org-node.manager { background: #fef3c7; border: 2px solid #fbbf24; }
.org-node.chief { background: #ecfdf5; border: 2px solid #34d399; }
.node-content { display: flex; flex-direction: column; gap: 8px; }
.node-title { font-size: 16px; font-weight: 600; color: #333; }
.node-count { font-size: 14px; color: #666; }
.upload-demo { margin-top: 8px; }
@media (max-width: 768px) {
  .org-level { flex-direction: column; align-items: center; }
  .org-node { min-width: 120px; padding: 16px; }
  .card-header { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
