import request from './request'

export function getUsers(params) {
  return request.get('/users', { params })
}

export function createUser(data) {
  return request.post('/users', data)
}

export function updateUser(id, data) {
  return request.put(`/users/${id}`, data)
}

export function updateUserStatus(id, status) {
  return request.put(`/users/${id}/status`, { status })
}

export function deleteUser(id) {
  return request.delete(`/users/${id}`)
}

export function getRoles() {
  return request.get('/users/roles')
}

export function updateRole(id, data) {
  return request.put(`/users/roles/${id}`, data)
}
