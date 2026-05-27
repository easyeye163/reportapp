<template>
  <div class="app">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <!-- 左侧logo和标题 -->
          <div class="header-brand">
            <button class="sidebar-toggle" @click="toggleSidebar">
              <el-icon :class="{ 'rotate': !sidebarCollapsed }"><Menu /></el-icon>
            </button>
            <div class="brand-icon">
              <img src="../logo.png" alt="福建港航船舶报告编制系统" class="logo-img" />
            </div>
            <h1 class="brand-title">福建港航船舶报告编制系统</h1>
          </div>
          
          <!-- 右侧操作按钮 -->
          <div class="header-actions">
            <button class="action-button" @click="handleNotification">
              <el-icon class="action-icon"><Bell /></el-icon>
              <span class="action-text">通知</span>
            </button>
            <button class="action-button" @click="handleUserCenter">
              <el-icon class="action-icon"><User /></el-icon>
              <span class="action-text">用户中心</span>
            </button>
            <button class="action-button" @click="handleSettings">
              <el-icon class="action-icon"><Setting /></el-icon>
              <span class="action-text">设置</span>
            </button>
            <!-- 用户信息 & 退出 -->
            <div class="user-info-section" v-if="currentUser">
              <span class="user-name">{{ currentUser.name || '用户' }}</span>
              <el-tag size="small" :type="getRoleType(currentUser.role)">{{ getRoleText(currentUser.role) }}</el-tag>
              <el-button type="danger" plain size="small" @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                退出
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="app-main">
      <!-- 侧边栏 -->
      <aside class="app-sidebar" :class="{ 'collapsed': sidebarCollapsed }">
        <nav class="sidebar-nav">
          <div class="nav-header" v-if="!sidebarCollapsed">功能模块</div>
          <router-link to="/" class="nav-item" active-class="active">
            <el-icon><Grid /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">框架管理</span>
          </router-link>
          <router-link to="/progress" class="nav-item" active-class="active">
            <el-icon><Timer /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">报告进度总表</span>
          </router-link>
          <router-link to="/guide" class="nav-item" active-class="active">
            <el-icon><Message /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">操作指南</span>
          </router-link>
          <router-link to="/cases" class="nav-item" active-class="active">
            <el-icon><Collection /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">标准与报告案例库</span>
          </router-link>
          <router-link to="/report-edit" class="nav-item" active-class="active">
            <el-icon><Document /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">报告编制</span>
          </router-link>
          <router-link to="/review" class="nav-item" active-class="active">
            <el-icon><Check /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">审核管理</span>
          </router-link>
          <router-link to="/export" class="nav-item" active-class="active">
            <el-icon><Download /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">报告出版</span>
          </router-link>
          <router-link to="/archive" class="nav-item" active-class="active">
            <el-icon><Folder /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">报告归档</span>
          </router-link>
          <router-link to="/user" class="nav-item" active-class="active">
            <el-icon><UserFilled /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">用户管理</span>
          </router-link>
          <router-link to="/backup" class="nav-item" active-class="active">
            <el-icon><Cpu /></el-icon>
            <span class="nav-spacer" v-if="!sidebarCollapsed"></span>
            <span v-if="!sidebarCollapsed">数据备份</span>
          </router-link>
        </nav>
      </aside>

      <!-- 内容区 -->
      <main class="app-content" :class="{ 'expanded': sidebarCollapsed }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Bell, User, Setting, Grid, Check, Download, Folder, UserFilled, Cpu, Timer, Message, Collection, Menu, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 侧边栏折叠状态
const sidebarCollapsed = ref(false)
const toggleSidebar = () => { sidebarCollapsed.value = !sidebarCollapsed.value }

// 当前用户
const currentUser = computed(() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
})

const getRoleType = (role: string) => ({ admin: 'danger', engineer: 'primary', manager: 'warning', chief: 'success' }[role] || 'default')
const getRoleText = (role: string) => ({ admin: '管理员', engineer: '工程师', manager: '主管', chief: '总工程师' }[role] || '未知')

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('permissions')
  ElMessage.success('已退出登录')
  router.push('/login')
}

// 处理通知
const handleNotification = () => { router.push('/notifications') }
const handleUserCenter = () => { router.push('/user-center') }
const handleSettings = () => { router.push('/settings') }
</script>

<style lang="scss">
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Noto Sans SC', sans-serif; background-color: #f8f9fa; color: #333; }
el-icon { position: static; display: inline-flex; align-items: center; justify-content: center; }
.app { min-height: 100vh; display: flex; flex-direction: column; }
.app-header { background: #ffffff; color: #333; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 12px 0; position: sticky; top: 0; z-index: 100; transition: all 0.3s ease;
  .container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }
  .header-content { display: flex; justify-content: space-between; align-items: center; }
  .header-brand { display: flex; align-items: center; gap: 12px;
    .sidebar-toggle { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 4px; transition: all 0.3s ease;
      &:hover { background: #f1f5f9; }
      el-icon { font-size: 20px; color: #0A3D62; transition: transform 0.3s ease; &.rotate { transform: rotate(90deg); } }
    }
    .brand-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(10, 61, 98, 0.2); transition: all 0.3s ease;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(10, 61, 98, 0.3); }
      .logo-img { width: 100%; height: 100%; object-fit: contain; }
    }
    .brand-title { font-size: 18px; font-weight: 600; color: #0A3D62; font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; margin: 0; flex-shrink: 0; white-space: nowrap; }
  }
  .header-actions { display: flex; align-items: center; gap: 12px; }
  .action-button { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #e9ecef; background: #ffffff; border-radius: 6px; color: #495057; font-size: 14px; font-weight: 500; transition: all 0.3s ease; cursor: pointer;
    &:hover { background: #f8f9fa; border-color: #0A3D62; color: #0A3D62; transform: translateY(-1px); }
    .action-icon { font-size: 16px; transition: all 0.3s ease; }
  }
  .user-info-section { display: flex; align-items: center; gap: 8px; margin-left: 8px; padding-left: 12px; border-left: 1px solid #e9ecef;
    .user-name { font-size: 14px; font-weight: 500; color: #333; }
  }
}
.app-main { flex: 1; display: flex; min-height: 0; transition: all 0.3s ease; }
.app-sidebar { width: 240px; background-color: #ffffff; border-right: 1px solid #e9ecef; box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05); transition: all 0.3s ease;
  &.collapsed { width: 64px; }
  .sidebar-nav { padding: 16px 0;
    .nav-header { padding: 0 24px 12px; font-size: 14px; font-weight: 600; color: #6c757d; transition: all 0.3s ease; }
    .nav-item { display: flex; align-items: center; padding: 12px 24px; color: #495057; text-decoration: none; transition: all 0.3s ease; border-left: 3px solid transparent;
      &:hover { background-color: #f8f9fa; color: #0A3D62; border-left-color: #0A3D62; }
      &.active { background-color: #e3f2fd; color: #0A3D62; border-left-color: #0A3D62; font-weight: 500; }
      el-icon { font-size: 18px; transition: all 0.3s ease; }
      .nav-spacer { width: 16px; flex-shrink: 0; }
    }
  }
}
.app-content { flex: 1; overflow-y: auto; background-color: #f8f9fa; padding: 24px; transition: all 0.3s ease;
  &.expanded { padding-left: 32px; }
}
@media (max-width: 768px) {
  .app-header { padding: 8px 0;
    .container { padding: 0 16px; }
    .header-brand { gap: 8px; .brand-title { font-size: 16px; } }
    .header-actions { gap: 8px; .action-button { padding: 6px 12px; font-size: 12px; .action-text { display: none; } }
    .user-info-section .user-name { display: none; }
    }
  }
  .app-sidebar { position: fixed; left: 0; top: 60px; height: calc(100vh - 60px); z-index: 99; transform: translateX(0);
    &.collapsed { transform: translateX(-100%); }
  }
  .app-content { padding: 16px; margin-left: 0; &.expanded { margin-left: 0; } }
}
@media (max-width: 992px) {
  .app-header { .header-brand { .brand-title { font-size: 16px; } } }
}
</style>
