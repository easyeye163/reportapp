import request from './request'

export function getArchives(params) {
  return request.get('/archives', { params })
}

export function downloadArchive(id, format = 'docx') {
  return request.get(`/archives/${id}/download`, { params: { format }, responseType: 'blob' })
}
