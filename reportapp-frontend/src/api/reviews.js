import request from './request'

export function getReviews(params) {
  return request.get('/reviews', { params })
}

export function submitReview(reportId, data) {
  return request.post(`/reviews/${reportId}`, data)
}

export function signReview(reportId) {
  return request.post(`/reviews/${reportId}/sign`)
}

export function stampReview(reportId) {
  return request.post(`/reviews/${reportId}/stamp`)
}

export function getReviewLevels(reportId) {
  return request.get(`/reviews/review-levels/${reportId}`)
}

export function updateReviewLevels(reportId, data) {
  return request.put(`/reviews/review-levels/${reportId}`, data)
}
