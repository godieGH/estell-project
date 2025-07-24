// src/stores/feeds.js
import { defineStore } from 'pinia'
import { api } from 'boot/axios'

export const useFeedsStore = defineStore('feeds', {
  actions: {
    async toggleLike(post_id) {
      await api.put(`/posts/${post_id}/togglelike`)
    },
  },
})
