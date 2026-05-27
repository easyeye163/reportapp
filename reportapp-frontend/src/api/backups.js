import request from './request'

export function getBackups(params) {
  return request.get('/backups', { params })
}

export function createBackup() {
  return request.post('/backups')
}

export function getBackupSettings() {
  return request.get('/backups/settings')
}

export function updateBackupSettings(data) {
  return request.put('/backups/settings', data)
}

export function downloadBackup(id) {
  return request.get(`/backups/${id}/download`, { responseType: 'blob' })
}

export function restoreBackup(id) {
  return request.post(`/backups/${id}/restore`)
}

export function deleteBackup(id) {
  return request.delete(`/backups/${id}`)
}
