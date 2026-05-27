import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器：添加token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理错误
request.interceptors.response.use(
  (response) => {
    // blob 类型响应（文件下载/导出）直接透传，不做 JSON 解析
    if (response.config.responseType === 'blob') {
      return response.data
    }
    const res = response.data
    if (res.success === false) {
      ElMessage.error(res.error || '请求失败')
      return Promise.reject(new Error(res.error || '请求失败'))
    }
    return res
  },
  (error) => {
    if (error.response) {
      // blob 响应的错误需要解析 JSON
      if (error.response.config?.responseType === 'blob') {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const errData = JSON.parse(reader.result)
            ElMessage.error(errData.error || '请求失败')
          } catch {
            ElMessage.error('请求失败')
          }
        }
        reader.readAsText(error.response.data)
        return Promise.reject(error)
      }
      const status = error.response.status
      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('permissions')
        window.location.href = '/login'
      } else if (status === 403) {
        ElMessage.error('没有权限执行此操作')
      } else if (status === 404) {
        ElMessage.error('请求的资源不存在')
      } else if (status === 409) {
        ElMessage.error(error.response.data?.error || '数据冲突')
      } else {
        ElMessage.error(error.response.data?.error || `请求失败 (${status})`)
      }
    } else {
      ElMessage.error('网络连接失败，请检查网络')
    }
    return Promise.reject(error)
  }
)

export default request
