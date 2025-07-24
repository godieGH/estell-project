// src/api/posts.js (assuming you named it posts.js now)
import { api } from 'boot/axios'

export async function getPosts(cursor, limit) {
  // Pass cursor and limit as query parameters for cleaner URLs and easier encryption handling
  return await api.get(`/api/feeds/fetch-feeds`, {
    params: {
      cursor: cursor,
      limit: limit,
    },
  })
}
