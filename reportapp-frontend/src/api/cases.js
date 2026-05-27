import request from './request'

export function getCases(params) {
  return request.get('/cases/cases', { params })
}

export function getCase(id) {
  return request.get(`/cases/cases/${id}`)
}

export function createCase(formData) {
  return request.post('/cases/cases', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function deleteCase(id) {
  return request.delete(`/cases/${id}`)
}

export function getStandards(params) {
  return request.get('/cases/standards', { params })
}

export function getStandard(id) {
  return request.get(`/cases/standards/${id}`)
}

export function createStandard(formData) {
  return request.post('/cases/standards', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateStandardStatus(id, status) {
  return request.put(`/cases/standards/${id}/status`, { status })
}

export function deleteStandard(id) {
  return request.delete(`/cases/standards/${id}`)
}
