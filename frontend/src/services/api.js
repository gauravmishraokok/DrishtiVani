import axios from 'axios'

const API_URL = '/api'

const api = {
  // Auth
  onboard: (data) => axios.post(`${API_URL}/auth/onboard`, data),
  login: (name) => axios.post(`${API_URL}/auth/login`, { name }),
  getProfile: (studentId) => axios.get(`${API_URL}/auth/me/${studentId}`),

  // Session
  sendCommand: (studentId, transcript) => axios.post(`${API_URL}/session/command`, { studentId, transcript }),
  startChapter: (studentId, chapterId, subjectRef) => axios.post(`${API_URL}/session/start-chapter`, { studentId, chapterId, subjectRef }),

  // Quiz & Progress
  getChapter: (chapterId) => axios.get(`${API_URL}/admin/chapter/${chapterId}`),
  submitQuizResult: (data) => axios.post(`${API_URL}/progress/submit-quiz`, data),
  getDashboardData: (studentId) => axios.get(`${API_URL}/progress/dashboard/${studentId}`),
  getCatalog: (classNum) => axios.get(`${API_URL}/progress/catalog/${classNum}`),

  // Admin
  uploadPDF: (formData) => axios.post(`${API_URL}/admin/ingest`, formData),
  getAdminCatalog: () => axios.get(`${API_URL}/admin/catalog`),
  deleteChapter: (chapterId) => axios.delete(`${API_URL}/admin/chapter/${chapterId}`),
  deleteSubject: (subjectId) => axios.delete(`${API_URL}/admin/subject/${subjectId}`),
  updateChapter: (chapterId, data) => axios.patch(`${API_URL}/admin/chapter/${chapterId}`, data),
  updateSubject: (subjectId, data) => axios.patch(`${API_URL}/admin/subject/${subjectId}`, data)
}

export default api
