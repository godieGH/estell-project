// stores/peopleStore.js
import { defineStore } from 'pinia'
import { getUsers, followUser, unfollowUser } from 'src/api/people'

export const usePeopleStore = defineStore('peopleStore', {
  state: () => ({
    people: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const { data } = await getUsers()
        //console.log(data)
        this.people = data
      } catch (err) {
        this.error = err
      } finally {
        this.loading = false
      }
    },

    async follow(id) {
      const user = this.people.find((u) => u.id === id)
      if (!user) return
      // optimistic
      user.isFollowing = true
      try {
        await followUser(id)
      } catch (err) {
        user.isFollowing = false
        console.log(err)
      }
    },
    async unfollow(id) {
      const user = this.people.find((u) => u.id === id)
      if (!user) return
      user.isFollowing = false
      try {
        await unfollowUser(id)
      } catch (err) {
        user.isFollowing = true
        console.log(err)
      }
    },
  },
})
