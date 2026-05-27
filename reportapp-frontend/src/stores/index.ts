import { defineStore } from 'pinia'
import { getFrames, createFrame as apiCreateFrame, updateFrame as apiUpdateFrame, deleteFrame as apiDeleteFrame, copyFrame as apiCopyFrame } from '../api/frames'
import { getReports, createReport as apiCreateReport, updateReport as apiUpdateReport, submitReport as apiSubmitReport, withdrawReport as apiWithdrawReport } from '../api/reports'
import { getUsers, createUser as apiCreateUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser, updateUserStatus as apiUpdateUserStatus } from '../api/users'

// 框架管理状态
export const useFrameStore = defineStore('frame', {
  state: () => ({
    frames: [] as any[],
    currentFrame: null as any,
    loading: false,
    total: 0
  }),
  actions: {
    async fetchFrames(params?: any) {
      this.loading = true
      try {
        const res: any = await getFrames(params)
        this.frames = res.data?.list || res.data || []
        this.total = res.data?.total || 0
      } catch (e) {
        // error handled by interceptor
      } finally {
        this.loading = false
      }
    },
    async addFrame(data: any) {
      const res: any = await apiCreateFrame(data)
      ElMessage.success('框架创建成功')
      return res.data
    },
    async updateFrame(id: number, data: any) {
      const res: any = await apiUpdateFrame(id, data)
      ElMessage.success('框架更新成功')
      return res.data
    },
    async removeFrame(id: number) {
      await apiDeleteFrame(id)
      ElMessage.success('框架删除成功')
    },
    async copyFrame(id: number) {
      const res: any = await apiCopyFrame(id)
      ElMessage.success('框架复制成功')
      return res.data
    },
    setCurrentFrame(frame: any) {
      this.currentFrame = frame
    }
  }
})

// 报告管理状态
export const useReportStore = defineStore('report', {
  state: () => ({
    reports: [] as any[],
    currentReport: null as any,
    loading: false,
    total: 0
  }),
  actions: {
    async fetchReports(params?: any) {
      this.loading = true
      try {
        const res: any = await getReports(params)
        this.reports = res.data?.list || res.data || []
        this.total = res.data?.total || 0
      } catch (e) {
        // error handled by interceptor
      } finally {
        this.loading = false
      }
    },
    async addReport(data: any) {
      const res: any = await apiCreateReport(data)
      ElMessage.success('报告创建成功')
      return res.data
    },
    async updateReport(id: number, data: any) {
      const res: any = await apiUpdateReport(id, data)
      ElMessage.success('报告更新成功')
      return res.data
    },
    async submitReport(id: number, data: any) {
      const res: any = await apiSubmitReport(id, data)
      ElMessage.success('报告已提交审核')
      return res.data
    },
    async withdrawReport(id: number) {
      const res: any = await apiWithdrawReport(id)
      ElMessage.success('报告已撤回')
      return res.data
    },
    setCurrentReport(report: any) {
      this.currentReport = report
    }
  }
})

// 用户管理状态
export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: JSON.parse(localStorage.getItem('user') || 'null') as any,
    users: [] as any[],
    loading: false,
    total: 0
  }),
  actions: {
    async fetchUsers(params?: any) {
      this.loading = true
      try {
        const res: any = await getUsers(params)
        this.users = res.data?.list || res.data || []
        this.total = res.data?.total || 0
      } catch (e) {
        // error handled by interceptor
      } finally {
        this.loading = false
      }
    },
    async addUser(data: any) {
      const res: any = await apiCreateUser(data)
      ElMessage.success('用户添加成功')
      return res.data
    },
    async updateUser(id: number, data: any) {
      const res: any = await apiUpdateUser(id, data)
      ElMessage.success('用户更新成功')
      return res.data
    },
    async removeUser(id: number) {
      await apiDeleteUser(id)
      ElMessage.success('用户已删除')
    },
    async toggleUserStatus(id: number, status: string) {
      await apiUpdateUserStatus(id, status)
      ElMessage.success(`用户已${status === 'active' ? '启用' : '禁用'}`)
    },
    setCurrentUser(user: any) {
      this.currentUser = user
      localStorage.setItem('user', JSON.stringify(user))
    },
    logout() {
      this.currentUser = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('permissions')
    }
  }
})
