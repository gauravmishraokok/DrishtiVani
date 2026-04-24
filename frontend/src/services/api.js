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
  
  // Quiz
  startQuiz: (studentId, chapterId) => axios.post(`${API_URL}/quiz/start`, { studentId, chapterId }),
  submitAnswer: (studentId, answerLetter) => axios.post(`${API_URL}/quiz/answer`, { studentId, answerLetter }),
  
  // Progress
  getDashboardData: (studentId) => axios.get(`${API_URL}/progress/dashboard/${studentId}`),
  getCatalog: (classNum) => axios.get(`${API_URL}/progress/catalog/${classNum}`),
  
  // Admin
  uploadPDF: (formData) => axios.post(`${API_URL}/admin/ingest`, formData),
  getIngestStatus: (jobId) => axios.get(`${API_URL}/admin/ingest/status/${jobId}`),
  deleteSubject: (subjectId) => axios.delete(`${API_URL}/admin/subject/${subjectId}`)
}

export default api
