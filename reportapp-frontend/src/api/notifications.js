import request from './request'

export function getNotifications(params) {
  return request.get('/notifications', { params })
}

export function markNotificationRead(id) {
  return request.put(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return request.put('/notifications/read-all')
}

export function deleteNotification(id) {
  return request.delete(`/notifications/${id}`)
}