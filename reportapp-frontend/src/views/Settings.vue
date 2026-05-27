<template>
  <div class="settings-page" v-loading="loading">
    <div class="page-header">
      <h2 class="text-2xl font-bold text-dark">系统设置</h2>
      <el-button type="primary" @click="saveAllSettings" :loading="saving"><el-icon><Check /></el-icon>保存设置</el-button>
    </div>

    <div class="settings-sections">
      <el-card class="settings-card">
        <template #header>
          <div class="card-header"><el-icon><Setting /></el-icon><span>基础设置</span></div>
        </template>
        <el-form :model="basicSettings" label-width="120px">
          <el-form-item label="系统名称"><el-input v-model="basicSettings.system_name" /></el-form-item>
          <el-form-item label="系统Logo">
            <el-upload action="#" :auto-upload="false" :show-file-list="false" accept=".png,.jpg,.jpeg">
              <el-button type="primary"><el-icon><Upload /></el-icon>上传Logo</el-button>
            </el-upload>
            <span class="upload-tip">建议尺寸: 200x50px，支持 PNG、JPG 格式</span>
          </el-form-item>
          <el-form-item label="语言"><el-select v-model="basicSettings.language"><el-option label="中文" value="zh-CN" /><el-option label="英文" value="en-US" /></el-select></el-form-item>
          <el-form-item label="时区"><el-select v-model="basicSettings.timezone"><el-option label="北京时间 (UTC+8)" value="Asia/Shanghai" /></el-select></el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-card">
        <template #header>
          <div class="card-header"><el-icon><Bell /></el-icon><span>通知设置</span></div>
        </template>
        <el-form :model="notificationSettings" label-width="120px">
          <el-form-item label="报告提交通知"><el-switch v-model="notificationSettings.notification_report_submit" /></el-form-item>
          <el-form-item label="审核结果通知"><el-switch v-model="notificationSettings.notification_review_result" /></el-form-item>
          <el-form-item label="系统公告通知"><el-switch v-model="notificationSettings.notification_system_notice" /></el-form-item>
          <el-form-item label="通知方式">
            <el-checkbox-group v-model="notificationSettings.notification_methods">
              <el-checkbox label="email">邮件通知</el-checkbox>
              <el-checkbox label="sms">短信通知</el-checkbox>
              <el-checkbox label="push">站内推送</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-card">
        <template #header>
          <div class="card-header"><el-icon><Document /></el-icon><span>报告设置</span></div>
        </template>
        <el-form :model="reportSettings" label-width="120px">
          <el-form-item label="默认审核层级"><el-select v-model="reportSettings.report_default_review_level"><el-option label="三级审核" :value="3" /><el-option label="四级审核" :value="4" /><el-option label="五级审核" :value="5" /></el-select></el-form-item>
          <el-form-item label="报告编号格式"><el-input v-model="reportSettings.report_code_format" placeholder="FZ-{年份}-{序号}" /></el-form-item>
          <el-form-item label="上传文件限制"><el-input-number v-model="reportSettings.report_max_file_size" :min="1" :max="500" />MB</el-form-item>
          <el-form-item label="图片上传数量"><el-input-number v-model="reportSettings.report_max_images" :min="1" :max="20" />张</el-form-item>
          <el-form-item label="自动保存"><el-switch v-model="reportSettings.report_auto_save" /><span class="setting-tip">每隔5分钟自动保存报告内容</span></el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-card">
        <template #header>
          <div class="card-header"><el-icon><Lock /></el-icon><span>安全设置</span></div>
        </template>
        <el-form :model="securitySettings" label-width="120px">
          <el-form-item label="密码有效期"><el-select v-model="securitySettings.security_password_expiry"><el-option label="90天" value="90" /><el-option label="180天" value="180" /><el-option label="永不过期" value="never" /></el-select></el-form-item>
          <el-form-item label="登录超时时间"><el-input-number v-model="securitySettings.security_session_timeout" :min="30" :max="720" />分钟</el-form-item>
          <el-form-item label="强制密码强度"><el-switch v-model="securitySettings.security_strong_password" /><span class="setting-tip">密码需包含大小写字母、数字和特殊字符</span></el-form-item>
          <el-form-item label="登录日志保留"><el-select v-model="securitySettings.security_log_retention"><el-option label="30天" value="30" /><el-option label="90天" value="90" /><el-option label="一年" value="365" /></el-select></el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check, Setting, Bell, Document, Upload, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getSettings, updateSettings } from '../api/settings'

const loading = ref(false)
const saving = ref(false)

const basicSettings = ref({
  system_name: '福建港航船舶报告编制系统',
  logo_url: '',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai'
})

const notificationSettings = ref({
  notification_report_submit: true,
  notification_review_result: true,
  notification_system_notice: true,
  notification_methods: ['push']
})

const reportSettings = ref({
  report_default_review_level: 3,
  report_code_format: 'FZ-{年份}-{序号}',
  report_max_file_size: 50,
  report_max_images: 9,
  report_auto_save: true
})

const securitySettings = ref({
  security_password_expiry: '180',
  security_session_timeout: 120,
  security_strong_password: true,
  security_log_retention: '90'
})

const loadSettings = async () => {
  loading.value = true
  try {
    const res: any = await getSettings()
    const data = res.data
    if (data) {
      basicSettings.value = {
        system_name: data.system_name || '福建港航船舶报告编制系统',
        logo_url: data.logo_url || '',
        language: data.language || 'zh-CN',
        timezone: data.timezone || 'Asia/Shanghai'
      }
      notificationSettings.value = {
        notification_report_submit: Boolean(data.notification_report_submit),
        notification_review_result: Boolean(data.notification_review_result),
        notification_system_notice: Boolean(data.notification_system_notice),
        notification_methods: data.notification_methods || ['push']
      }
      reportSettings.value = {
        report_default_review_level: data.report_default_review_level || 3,
        report_code_format: data.report_code_format || 'FZ-{年份}-{序号}',
        report_max_file_size: data.report_max_file_size || 50,
        report_max_images: data.report_max_images || 9,
        report_auto_save: Boolean(data.report_auto_save)
      }
      securitySettings.value = {
        security_password_expiry: data.security_password_expiry || '180',
        security_session_timeout: data.security_session_timeout || 120,
        security_strong_password: Boolean(data.security_strong_password),
        security_log_retention: data.security_log_retention || '90'
      }
    }
  } catch (e) {} finally { loading.value = false }
}

const saveAllSettings = async () => {
  saving.value = true
  try {
    await updateSettings({
      ...basicSettings.value,
      notification_report_submit: notificationSettings.value.notification_report_submit ? 1 : 0,
      notification_review_result: notificationSettings.value.notification_review_result ? 1 : 0,
      notification_system_notice: notificationSettings.value.notification_system_notice ? 1 : 0,
      notification_methods: notificationSettings.value.notification_methods,
      report_default_review_level: reportSettings.value.report_default_review_level,
      report_code_format: reportSettings.value.report_code_format,
      report_max_file_size: reportSettings.value.report_max_file_size,
      report_max_images: reportSettings.value.report_max_images,
      report_auto_save: reportSettings.value.report_auto_save ? 1 : 0,
      security_password_expiry: securitySettings.value.security_password_expiry,
      security_session_timeout: securitySettings.value.security_session_timeout,
      security_strong_password: securitySettings.value.security_strong_password ? 1 : 0,
      security_log_retention: securitySettings.value.security_log_retention
    })
    ElMessage.success('设置已保存')
  } catch (e) {} finally { saving.value = false }
}

onMounted(() => { loadSettings() })
</script>

<style scoped lang="scss">
.settings-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.settings-sections { display: flex; flex-direction: column; gap: 24px; }
.settings-card { .card-header { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 500; color: #303133; } }
.upload-tip { margin-left: 12px; font-size: 12px; color: #909399; }
.setting-tip { margin-left: 8px; font-size: 12px; color: #909399; }
</style>