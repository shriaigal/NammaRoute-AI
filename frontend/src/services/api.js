import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const client = axios.create({ baseURL: BASE_URL, timeout: 20000 })

function unwrap(promise) {
  return promise
    .then((res) => ({ data: res.data, error: null }))
    .catch((err) => ({
      data: null,
      error:
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Metro information is temporarily unavailable.',
    }))
}

export const api = {
  // Station endpoints
  getStations: () => unwrap(client.get('/api/stations')),
  getStation: (code) => unwrap(client.get(`/api/stations/${code}`)),
  getNetwork: () => unwrap(client.get('/api/network')),

  // Route endpoints
  getRoute: (source, destination) =>
    unwrap(client.get('/api/route', { params: { source, destination } })),
  getAlternativeRoute: (source, destination) =>
    unwrap(client.get('/api/alternative-route', { params: { source, destination } })),

  // Current live information
  getCurrentStatus: () => unwrap(client.get('/api/current-status')),
  getCurrentNews: (topic = '') => unwrap(client.get('/api/current-news', { params: { topic } })),
  getCurrentUpdates: () => unwrap(client.get('/api/current-updates')),
  getStationCurrent: (code) => unwrap(client.get(`/api/station/${code}/current`)),

  // Demand / predictions
  getDemand: () => unwrap(client.get('/api/demand')),
  getDemandPrediction: (station_code) =>
    unwrap(client.get('/api/demand/prediction', { params: { station_code } })),

  // AI
  aiRecommend: (context) => unwrap(client.post('/api/ai/recommend', context)),
  chat: (message, conversation = []) =>
    unwrap(client.post('/api/chat', { message, conversation })),

  // Health
  health: () => unwrap(client.get('/api/health')),
}

export default api
