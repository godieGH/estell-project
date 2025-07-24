// src/stores/user.js
import { defineStore } from 'pinia'
import { api } from 'boot/axios'
import { LocalStorage } from 'quasar'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    email: (state) => state.user?.email || '',
  },
  actions: {
    async initialize() {
      if (!this.isLoggedIn) {
        try {
          const res = await api.post('/users/token/refresh')
          this.user = res.data.user
          this.token = res.data.accessToken
          api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        } catch (err) {
          console.log(err.status)
          console.log(err)
          return true
        }
      }
    },

    async fetchUsersData() {
      try {
        const { data } = await api.post('/users/token/refresh')
        this.user = data.user
      } catch (err) {
        console.error(err)
      }
    },

    async setUser(userData, jwtToken) {
      this.user = userData
      this.token = jwtToken
      api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
    },

    async clearUser() {
      try {
        const res = await api.post('/users/logout', this.user)
        console.log(res.data.message, 'done')
        this.user = null
        this.token = null
        LocalStorage.clear()
      } catch (err) {
        if (err) {
          console.log(err)
        }
      }
    },

    async logout() {
      await this.clearUser()
    },
  },
})
