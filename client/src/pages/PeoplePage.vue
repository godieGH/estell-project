<template>
  <q-page padding class="flex justify-center">
    <div class="list-wrapper">
      <q-toolbar class="q-mb-sm">
        <q-toolbar-title class="text-h6">Discover Creators</q-toolbar-title>
      </q-toolbar>

      <div v-if="initialLoading" class="people-list-container">
        <div
          v-for="n in 10"
          :key="n"
          class="q-py-sm q-px-md flex items-center"
          style="height: 72px"
        >
          <q-item-section avatar>
            <q-skeleton type="circle" width="40px" height="40px" />
          </q-item-section>
          <q-item-section class="q-pl-md" style="flex: 1">
            <q-skeleton type="text" width="30%" />
            <q-skeleton type="text" width="50%" class="q-mt-xs" />
          </q-item-section>
          <q-item-section side>
            <q-skeleton type="rect" width="70px" height="28px" />
          </q-item-section>
        </div>
      </div>

      <div v-else-if="error && !people.length" class="text-red text-center q-my-xl">
        Failed to load users.
        <q-btn :loading="retry" flat label="Retry" @click="refresh" />
      </div>

      <div v-else id="peopleListScrollArea" class="people-list-container" @scroll="handleScroll">
        <q-virtual-scroll
          scroll-target="#peopleListScrollArea"
          :items="people"
          v-slot="{ item: user }"
          virtual-scroll-item-size="72"
        >
          <div
            :key="user.id"
            class="q-item clickable q-py-sm flex items-center"
            style="height: 72px"
            @click="PreviewUser(user.id)"
          >
            <q-item-section avatar>
              <q-avatar>
                <img :src="avatarSrc(user.avatar)" alt="Avatar" />
              </q-avatar>
            </q-item-section>
            <q-item-section class="q-pl-md" style="flex: 1">
              <q-item-label>{{ user.name }} </q-item-label>
              <q-item-label caption class="bio-text">
                <span class="text-grey">@{{ user.username }}</span> •
                <span class="text-green">{{ user.bio || defaultBio }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                :label="user.isFollowing ? 'Unfollow' : 'Follow'"
                size="sm"
                unelevated
                color="primary"
                :disable="actionInProgress[user.id]"
                @click.stop="toggleFollow(user)"
              />
            </q-item-section>
          </div>
        </q-virtual-scroll>

        <div v-if="loadingMore" class="text-center q-py-md">
          <q-spinner-dots color="primary" size="40px" />
        </div>
        <div v-else-if="!pagination.hasMore && people.length" class="text-center text-grey q-py-md">
          No more creators to load.
        </div>
        <div v-if="error && people.length && !loadingMore" class="text-red text-center q-my-sm">
          Failed to load more users.
          <q-btn :loading="retry" flat label="Retry" @click="refreshMore" />
        </div>
      </div>
    </div>

    <q-dialog v-model="showDrawer" :maximized="true" position="bottom" transition-show="slide-up">
      <q-card style="max-width: 800px" :style="`height: ${$q.screen.height}px;`">
        <div class="q-mt-md" style="position: sticky; top: 0; z-index: 1; padding: 8px">
          <q-btn flat round icon="close" @click="showDrawer = false" />
          <span style="margin-left: 8px">Profile</span>
        </div>
        <div>
          <ProfilePreview :post="{ user: { id: activeUserId } }" />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import ProfilePreview from 'components/ProfilePreview.vue'
import { getUsers, followUser, unfollowUser } from 'src/api/people'
import { useQuasar, throttle } from 'quasar'

const $q = useQuasar()
const people = ref([])
const initialLoading = ref(true) // For first fetch loading state
const loadingMore = ref(false) // For subsequent fetches (scrolling)
const error = ref(null)
const retry = ref(false)

const actionInProgress = reactive({})

const activeUserId = ref(null)
const showDrawer = ref(false)

const defaultBio = 'Hey there, I’m using Ethred…'

const pagination = reactive({
  limit: 20,
  cursor: null,
  hasMore: true,
})

// Renamed from fetchUsers to fetchPeople for clarity and consistency with the example
async function fetchPeople(isInitialLoad = false) {
  // Guard against concurrent fetches or no more data
  if (
    (isInitialLoad && initialLoading.value === false && people.value.length > 0) || // Already loaded initial data
    (!isInitialLoad && loadingMore.value) || // Already loading more
    (!isInitialLoad && !pagination.hasMore) // No more data to load (for loadMore calls)
  ) {
    return
  }

  error.value = null // Clear previous errors

  if (isInitialLoad) {
    initialLoading.value = true
    people.value = [] // Clear current data for a fresh load
    pagination.cursor = null // Reset cursor for fresh load
    pagination.hasMore = true // Assume more data for a fresh load
  } else {
    loadingMore.value = true // Set loading state for "load more"
  }

  try {
    const { data, nextCursor, hasMore } = await getUsers(pagination.limit, pagination.cursor)

    // Append new data to existing list
    people.value.push(...data)

    pagination.cursor = nextCursor // Update cursor
    pagination.hasMore = hasMore // Update hasMore based on backend response
  } catch (err) {
    console.error('Error fetching people:', err)
    error.value = err
    /*$q.notify({
      color: 'negative',
      message: isInitialLoad ? 'Failed to load creators.' : 'Failed to load more creators.',
      icon: 'report_problem',
      position: 'top',
      timeout: 3000,
    })*/
  } finally {
    // Reset loading states in finally block
    if (isInitialLoad) {
      initialLoading.value = false
    } else {
      loadingMore.value = false
    }
    retry.value = false
  }
}

async function follow(id) {
  const user = people.value.find((u) => u.id === id)
  if (!user) return

  user.isFollowing = true
  try {
    await followUser(id)
  } catch (err) {
    user.isFollowing = false
    console.error('Error following user:', err)
  }
}

async function unfollow(id) {
  const user = people.value.find((u) => u.id === id)
  if (!user) return

  user.isFollowing = false
  try {
    await unfollowUser(id)
  } catch (err) {
    user.isFollowing = true
    console.error('Error unfollowing user:', err)
  }
}

function avatarSrc(filename) {
  return filename ? `/uploads/${filename}` : `default.png`
}

async function toggleFollow(user) {
  if (actionInProgress[user.id]) return

  actionInProgress[user.id] = true
  try {
    if (user.isFollowing) await unfollow(user.id)
    else await follow(user.id)
  } finally {
    delete actionInProgress[user.id]
  }
}

function PreviewUser(id) {
  activeUserId.value = id
  showDrawer.value = true
}

// Throttled scroll handler, simplified.
const handleScroll = throttle((event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  const distanceToBottom = scrollHeight - scrollTop - clientHeight

  // Only attempt to fetch if there's potentially more data and we're not currently loading more.
  if (distanceToBottom < 300 && pagination.hasMore && !loadingMore.value) {
    fetchPeople(false) // Request to load more data
  }
}, 200) // Increased throttle delay slightly to 200ms

onMounted(() => {
  fetchPeople(true) // Initial load
})

function refresh() {
  retry.value = true
  fetchPeople(true)
}
function refreshMore() {
  retry.value = true
  fetchPeople(false)
}
</script>

<style scoped>
.q-page.flex {
  display: flex;
  justify-content: center;
}

.list-wrapper {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: 0;
}

.people-list-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  max-height: calc(100vh - 160px);
  min-height: 200px;
  border-radius: 8px;
}

.bio-text {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-item {
  height: 72px;
  display: flex;
  align-items: center;
}
</style>
