import { defineStore } from 'pinia'
import { api } from 'boot/axios'
import { LocalStorage } from 'quasar'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    dark: LocalStorage.getItem('pref_dark') ?? false,
    push: LocalStorage.getItem('pref_push') ?? true,
    email: LocalStorage.getItem('pref_email') ?? true,
    autoplay: LocalStorage.getItem('pref_autoplay') ?? false,
    mute: LocalStorage.getItem('pref_mute') ?? false,
  }),

  actions: {
    async fetcUserPreferedSettings() {
      const { data } = await api.get(`/users/preference/`)
      for (let key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          this[key] = Boolean(data[key])
          LocalStorage.set(`pref_${key}`, data[key])
        }
      }
    },

    async updateSettings(key, val) {
      await api.patch('/users/preference', { [key]: val })
      LocalStorage.set(`pref_${key}`, val)
      this[key] = val
    },
  },
})
