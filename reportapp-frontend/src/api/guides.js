import request from './request'

export function getGuides(params) {
  return request.get('/guides', { params })
}

export function createGuide(formData) {
  return request.post('/guides', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
