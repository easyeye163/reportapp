import request from './request'

export function getFrames(params) {
  return request.get('/frames', { params })
}

export function getFrame(id) {
  return request.get(`/frames/${id}`)
}

export function createFrame(formData) {
  return request.post('/frames', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateFrame(id, formData) {
  return request.put(`/frames/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function copyFrame(id) {
  return request.post(`/frames/${id}/copy`)
}

export function deleteFrame(id) {
  return request.delete(`/frames/${id}`)
}
