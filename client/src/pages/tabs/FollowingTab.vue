<template>
  <div v-if="initialLoading">
    <div v-for="n in 7" :key="n" class="row items-center q-py-sm list-item">
      <q-skeleton type="circle" class="avatar-skel-small" />
      <q-skeleton type="text" width="30%" class="q-ml-sm" />
      <q-skeleton type="rect" width="20%" height="30px" class="q-ml-auto btn-skel" />
    </div>
  </div>

  <div v-else>
    <div
      v-for="f in followingList"
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
          :label="f.isFollowing ? 'Unfollow' : 'Follow'"
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
        <ProfilePreview :post="{ user: { id: activeUserId } }" />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import ProfilePreview from 'components/ProfilePreview.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { followUser, unfollowUser } from 'src/api/people'
import { api } from 'boot/axios'
import { getAvatarSrc } from '../../composables/formater'
import { EventBus } from 'boot/event-bus'

const initialLoading = ref(true)
const loadingMore = ref(false)
const followingList = ref([])
const cursor = ref(null)
const limit = 20
const hasMore = ref(true)

const activeUserId = ref(null)
const showDrawer = ref(false)

function PreviewUser(id) {
  activeUserId.value = id
  showDrawer.value = true
}

async function fetchFollowing(isFirst = false) {
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
    const { data } = await api.get(`/users/following/list/${cursor.value}/${limit}`)
    const existingFollowingUserIds = new Set(followingList.value.map((user) => user.id))

    // Ensure new users also get the isToggling property
    const newFollowingUsers = data.users
      .filter((newFollowedUser) => !existingFollowingUserIds.has(newFollowedUser.id))
      .map((user) => ({ ...user, isToggling: false })) // ADDED THIS LINE

    followingList.value.push(...newFollowingUsers)

    if (data.nextCursor == null) {
      hasMore.value = false
    } else {
      cursor.value = data.nextCursor
    }
  } finally {
    //console.log(followingList.value)
    if (isFirst) initialLoading.value = false
    else loadingMore.value = false
  }
}

onMounted(() => fetchFollowing(true))

defineExpose({
  fetchFollowing,
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
    const f = followingList.value.find((u) => u.id === id)
    if (f) {
      f.isFollowing = !f.isFollowing
    }
  })
})

onBeforeUnmount(() => {
  EventBus.off('updateFollowBtnState')
})
</script>
