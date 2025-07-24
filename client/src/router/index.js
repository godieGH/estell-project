// src/router/index.js
import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useUserStore } from 'stores/user'

export default defineRouter(async ({ store }) => {
  const userStore = useUserStore(store)
  // Optional: await initialization (e.g. check token validity)
  if (userStore.initialize) {
    await userStore.initialize()
  }

  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior(to, from, savedPosition) {
      if (to.hash) {
        return {
          el: to.hash,
          behavior: 'smooth',
          // Quasar: Adjust 'top' if you have fixed headers/toolbars
          top: 50, // Example: If your QHeader is 50px tall
        }
      } else if (savedPosition) {
        return savedPosition
      } else {
        return { top: 0, left: 0 }
      }
    },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to) => {
    const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
    if (requiresAuth && !userStore.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    return true
  })

  return Router
})
