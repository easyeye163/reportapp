import request from './request'

export function getArchives(params) {
  return request.get('/archives', { params })
}

export function downloadArchive(id) {
  return request.get(`/archives/${id}/download`, { responseType: 'blob' })
}
