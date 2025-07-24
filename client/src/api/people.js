// src/api/people.js
import { api } from 'boot/axios'

export async function getUsers(limit = 20, cursor = null) {
  // Renamed encryptedCursor to cursor
  try {
    const params = {
      limit: limit,
    }

    // Only add the cursor parameter if it's not null or an empty string
    if (cursor && cursor !== '') {
      params.cursor = cursor
    }

    const response = await api.get('/users', { params })

    // Destructure the response data correctly as sent by your backend
    const { users, next_cursor, has_more } = response.data

    return {
      data: users,
      nextCursor: next_cursor, // This will now be the unencrypted cursor string (or null)
      hasMore: has_more,
    }
  } catch (error) {
    console.error('Error fetching users:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
      console.error('Response status:', error.response.status)
    } else if (error.request) {
      console.error('No response received:', error.request)
    } else {
      console.error('Error message:', error.message)
    }
    throw error
  }
}

export async function followUser(id) {
  return api.post(`/users/${id}/follow`)
}

export async function unfollowUser(id) {
  return api.delete(`/users/${id}/follow`)
}

export async function getProfileCounts() {
  return api.get(`/users/profile/counts`)
}
