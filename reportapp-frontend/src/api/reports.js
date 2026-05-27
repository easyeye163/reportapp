import request from './request'

export function getReports(params) {
  return request.get('/reports', { params })
}

export function getReport(id) {
  return request.get(`/reports/${id}`)
}

export function createReport(data) {
  return request.post('/reports', data)
}

export function updateReport(id, data) {
  return request.put(`/reports/${id}`, data)
}

export function submitReport(id, data) {
  return request.post(`/reports/${id}/submit`, data)
}

export function withdrawReport(id) {
  return request.post(`/reports/${id}/withdraw`)
}

export function deleteReport(id) {
  return request.delete(`/reports/${id}`)
}

export function exportReport(id, params) {
  const format = params?.format || 'json'
  const responseType = format === 'json' ? 'json' : 'blob'
  return request.get(`/reports/${id}/export`, { params, responseType })
}

export function uploadImages(id, formData) {
  return request.post(`/reports/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function deleteImage(reportId, imageId) {
  return request.delete(`/reports/${reportId}/images/${imageId}`)
}

export function updateImageDescription(reportId, imageId, description) {
  return request.put(`/reports/${reportId}/images/${imageId}`, { description })
}

export function updateTeam(id, data) {
  return request.put(`/reports/${id}/team`, data)
}
