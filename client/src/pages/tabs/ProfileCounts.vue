<template>
  <div style="display: flex; justify-content: space-around">
    <div class="count-box" @click="tab('posts')">
      <q-skeleton v-if="loadingCounts" type="text" width="40px" class="count-skel" />
      <div v-else class="count-value">
        {{ formatCount(postsCount) }}
      </div>
      <div class="count-label">Posts</div>
    </div>
    <div class="count-box" @click="tab('following')">
      <q-skeleton v-if="loadingCounts" type="text" width="40px" class="count-skel" />
      <div v-else class="count-value">
        {{ formatCount(followingCount) }}
      </div>
      <div class="count-label">Following</div>
    </div>
    <div class="count-box" @click="tab('followers')">
      <q-skeleton v-if="loadingCounts" type="text" width="40px" class="count-skel" />
      <div v-else class="count-value">
        {{ formatCount(followersCount) }}
      </div>
      <div class="count-label">Followers</div>
    </div>
  </div>
</template>
<script setup>
import { formatCounts as formatCount } from 'src/composables/formater'
import { getProfileCounts } from 'src/api/people'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { EventBus } from 'boot/event-bus'
import { useRouter } from 'vue-router'

const router = useRouter()

const loadingCounts = ref(true)
const postsCount = ref(0)
const followersCount = ref(0)
const followingCount = ref(0)

const emit = defineEmits(['tab'])
function tab(t) {
  emit('tab', t)
}

async function fetchCounts() {
  try {
    const { data } = await getProfileCounts()

    postsCount.value = data.postsCount
    followersCount.value = data.followersCount
    followingCount.value = data.followingCount
  } catch (err) {
    console.log(err.message)
    if (err.status === 401) {
      router.push({ path: '/auth/login' })
    }
  } finally {
    loadingCounts.value = false
  }
}

onMounted(() => {
  fetchCounts()
  EventBus.on('updateCounts', fetchCounts)
  EventBus.on('postDeleted', () => {
    postsCount.value--
  })
})

onBeforeUnmount(() => {
  EventBus.off('updateCounts', fetchCounts)
  EventBus.off('postDeleted')
})
</script>

<style scoped>
.counts-row {
  display: flex;
  justify-content: space-around;
}
.count-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.count-value {
  font-size: 1.2rem;
  font-weight: 600;
}
.count-label {
  font-size: 0.8rem;
  color: gray;
}
.count-skel {
  height: 28px;
}
</style>
