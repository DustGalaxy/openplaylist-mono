import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'

// ============================================================
// Типы для API слоя (FSD: 06_shared/api/model)
// ============================================================
export interface ApiResponse<T = unknown> {
  data: T
  status: number
  message?: string
}

export interface ApiError {
  status: number
  message: string
  details?: unknown
}

// ============================================================
// API Конфигурация
// ============================================================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const REQUEST_TIMEOUT = import.meta.env.VITE_API_TIMEOUT ? Number(import.meta.env.VITE_API_TIMEOUT) : 10000

// ============================================================
// API Клиент (FSD: 06_shared/api/lib)
// ============================================================
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Перехватчик запроса - добавляет авторизацию
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Перехватчик ответа - обрабатывает ошибки
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Обработка неавторизованного доступа
      console.error('Unauthorized - token expired or invalid')
      localStorage.removeItem('authToken')
      // Можно добавить редирект на страницу логина
      // window.location.href = '/login'
    }

    if (error.response?.status === 403) {
      console.error('Forbidden - insufficient permissions')
    }

    if (error.response?.status === 500) {
      console.error('Server error')
    }

    return Promise.reject(error)
  },
)

// ============================================================
// Экспорт для других слоев (FSD: публичный API)
// ============================================================
// Используется в 04_features, 03_widgets, 02_pages для API запросов
export const api = apiClient

// Экспорт типов для использования в других слоях
export type { AxiosResponse, AxiosError }
