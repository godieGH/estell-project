// Quasar CLI + Vite
import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// Determine the base URL based on the environment
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    // For development, use the VITE_API_BASE_URL from your .env file
    return process.env.VITE_API_BASE_URL
  } else {
    // For production, use '/' to indicate a relative path
    return '/'
  }
}

// 1. Create an Axios instance with credentials enabled
const api = axios.create({
  baseURL: getBaseUrl(), // Use the dynamically determined base URL
  withCredentials: true, // ← include cookies on cross-site
})

export default defineBoot(({ app }) => {
  // 2. Expose for Options API
  app.config.globalProperties.$axios = axios // default axios
  app.config.globalProperties.$api = api // your preconfigured instance

  // 3. Expose for Composition API via provide/inject
  app.provide('axios', axios)
  app.provide('api', api)
})

export { axios, api }
