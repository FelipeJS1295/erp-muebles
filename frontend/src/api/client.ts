import axios from 'axios'

const API_BASE_URL = 'https://b2b.jerkhome.cl/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
})

// Interceptor para agregar token automáticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar token expirado
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// Marketplaces
export const marketplaceApi = {
  getWalmartOrdenes: (estado = 'Created', dias = 30) =>
    api.get(`/marketplaces/walmart/ordenes?estado=${estado}&dias=${dias}`),
  getWalmartProductos: (limit = 5) =>
    api.get(`/marketplaces/walmart/productos?limit=${limit}`),
  getParisOrdenes: (limit = 50) =>
    api.get(`/marketplaces/paris/ordenes?limit=${limit}`),
  getParisProductos: (limit = 50) =>
    api.get(`/marketplaces/paris/productos?limit=${limit}`),
  imprimirEtiquetaParis: (labelId: string) =>
    api.post(`/marketplaces/paris/etiqueta/${labelId}`),
}

// Base de datos
export const dbApi = {
  getOrdenes: (marketplace?: string, limit = 50) =>
    api.get(`/ordenes?limit=${limit}${marketplace ? `&marketplace=${marketplace}` : ''}`),
  syncWalmart: () => api.post('/ordenes/sync/walmart'),
  syncParis: () => api.post('/ordenes/sync/paris'),
  syncFalabella: () => api.post('/ordenes/sync/falabella'),
}