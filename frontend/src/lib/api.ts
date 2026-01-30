import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_URL,
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
  }

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
    console.log('Token attached to request')
  } else {
    console.warn('No session/token available')
  }

  return config
})

// Log response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)
