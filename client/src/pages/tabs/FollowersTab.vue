<template>
  <!-- Loading skeleton while fetching -->
  <div v-if="initialLoading">
    <div v-for="n in 7" :key="n" class="row items-center q-py-sm list-item">
      <q-skeleton type="circle" class="avatar-skel-small" />
      <q-skeleton type="text" width="30%" class="q-ml-sm" />
      <q-skeleton type="rect" width="20%" height="30px" class="q-ml-auto btn-skel" />
    </div>
  </div>

  <div v-else>
    <div
      v-for="f in followersList"
      :key="f.id"
      class="row items-center q-py-sm list-item"
      @click="PreviewUser(f.id)"
    >
      <q-avatar class="avatar-skel-small">
        <img :src="getAvatarSrc(f.avatar)" />
      </q-avatar>
      <div class="q-ml-sm">
        {{ f.name }}
      </div>
      <div class="q-ml-auto">
        <q-btn
          :label="f.isFollowing ? 'Unfollow' : 'Follow Back'"
          size="sm"
          unelevated
          color="primary"
          :disable="f.isToggling"
          @click.stop="toggleFollow(f)"
        />
      </div>
    </div>

    <div v-if="loadingMore" class="flex justify-center q-my-md">
      <q-spinner-dots size="24px" />
    </div>
  </div>

  <q-dialog v-model="showDrawer" :maximized="true" position="bottom" transition-show="slide-up">
    <q-card style="max-width: 800px" :style="`height: ${$q.screen.height}px;`">
      <div class="q-mt-md" style="position: sticky; top: 0; z-index: 1; padding: 8px">
        <q-btn flat round icon="close" @click="showDrawer = false" />
        <span style="margin-left: 8px">Profile</span>
      </div>
      <div>
        <!-- 🔥 Here’s the fix: -->
        <ProfilePreview :post="{ user: { id: activeUserId } }" />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import ProfilePreview from 'components/ProfilePreview.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { api } from 'boot/axios'
import { getAvatarSrc } from '../../composables/formater'
import { followUser, unfollowUser } from 'src/api/people'
import { EventBus } from 'boot/event-bus'

const initialLoading = ref(true)
const loadingMore = ref(false)
const followersList = ref([])
const cursor = ref(null)
const limit = 20
const hasMore = ref(true)

const activeUserId = ref(null)
const showDrawer = ref(false)

function PreviewUser(id) {
  activeUserId.value = id
  showDrawer.value = true
}

async function fetchFollowers(isFirst = false) {
  if (
    (isFirst && initialLoading.value === false) ||
    (!isFirst && loadingMore.value) ||
    !hasMore.value
  ) {
    return
  }

  if (isFirst) {
    initialLoading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const { data } = await api.get(`/users/followers/list/${cursor.value}/${limit}`)

    // Get a set of existing follower IDs for efficient lookup
    const existingFollowerIds = new Set(followersList.value.map((f) => f.id))

    // Filter out users that are already in the list and add isToggling property
    const newFollowerUsers = data.users
      .filter((newUser) => !existingFollowerIds.has(newUser.id))
      .map((user) => ({ ...user, isToggling: false })) // Correctly add isToggling

    followersList.value.push(...newFollowerUsers)

    if (data.nextCursor == null) {
      hasMore.value = false
    } else {
      cursor.value = data.nextCursor
    }
  } finally {
    if (isFirst) initialLoading.value = false
    else loadingMore.value = false
  }
}

onMounted(() => fetchFollowers(true))

defineExpose({
  fetchFollowers,
})

async function toggleFollow(f) {
  f.isToggling = true
  try {
    if (f.isFollowing) {
      await unfollowUser(f.id)
      f.isFollowing = !f.isFollowing
    } else {
      await followUser(f.id)
      f.isFollowing = !f.isFollowing
    }
  } catch (err) {
    console.error(err.message)
  } finally {
    f.isToggling = false
    EventBus.emit('updateCounts')
  }
}

onMounted(() => {
  EventBus.on('updateFollowBtnState', (id) => {
    const f = followersList.value.find((u) => u.id === id)
    if (f) {
      f.isFollowing = !f.isFollowing
    }
  })
})

onBeforeUnmount(() => {
  EventBus.off('updateFollowBtnState')
})
</script>
