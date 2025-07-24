<template>
  <div>
    <!-- Action Buttons -->
    <div v-if="loading" class="row items-center justify-between no-wrap q-pa-md">
      <div class="row items-center">
        <q-icon name="far fa-comment" color="grey-4" class="q-mr-sm" size="18px" />
        <q-skeleton type="text" width="30px" />
      </div>

      <div class="row items-center">
        <q-icon name="send" color="grey-4" class="q-mr-sm" size="18px" />
        <q-skeleton type="text" width="30px" />
      </div>

      <div class="row items-center">
        <q-icon name="favorite_border" color="grey-4" class="q-mr-sm" size="18px" />
        <q-skeleton type="text" width="30px" />
      </div>
    </div>

    <div v-else class="row items-center justify-between no-wrap q-pa-md">
      <div class="row items-center" @click="openDrawer('comments')">
        <q-icon name="far fa-comment" color="grey-4" class="q-mr-sm" size="18px" />
        <span>{{ formatCounts(commentsCount) }}</span>
      </div>

      <div class="row items-center">
        <q-icon name="send" color="grey-4" class="q-mr-sm" size="18px" />
        <span>{{ formatCounts(sharesCount) }}</span>
      </div>

      <div class="row items-center">
        <q-icon
          :name="post.likedByMe ? 'favorite' : 'favorite_border'"
          :color="post.likedByMe ? 'red' : 'grey-4'"
          class="q-mr-sm like-btn"
          size="20px"
          @click="toggleLike(post)"
        />
        <span @click="openDrawer('likes')">{{ formatCounts(likesCount) }}</span>
      </div>
    </div>
    <q-dialog v-model="showDrawer" position="bottom" transition-show="slide-up">
      <q-card
        :style="{
          paddingTop: '30px',
          'border-radius': '20px',
          position: 'relative',
          display: 'flex',
          'flex-direction': 'column',
          height: currentDrawerHeight,
          width: '100%',
          'max-width': '600px',
        }"
      >
        <span class="handle-close" @click="showDrawer = false"></span>

        <div style="flex: 1 1 auto; overflow-y: auto; padding: 8px">
          <component :is="currentPanelComponent" :post="activePost" />
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, shallowRef } from 'vue'
import { formatCounts } from 'src/composables/formater'
import { api } from 'boot/axios'

const props = defineProps({
  post: Object,
})

const loading = ref(false)
const postId = props.post.id
const likesCount = ref(0)
const sharesCount = ref(0)
const commentsCount = ref(0)

import CommentsPanel from 'components/CommentsPanel.vue'
import LikesPanel from 'components/LikesPanel.vue'

const currentPanelComponent = shallowRef(null)
const activePost = ref(null)
const showDrawer = ref(false)
const panelTitle = ref(null)

const drawerHeightMap = {
  CommentsPanel: '95vh',
  LikesPanel: '95vh',
}

const currentDrawerHeight = computed(() => {
  if (currentPanelComponent.value && currentPanelComponent.value.__name) {
    // __name gives the component name
    return drawerHeightMap[currentPanelComponent.value.__name] || 'auto' // Fallback to 'auto' or a default
  }
  return 'auto'
})

function openDrawer(t) {
  showDrawer.value = true
  if (t === 'comments') {
    panelTitle.value = 'Comments'
    currentPanelComponent.value = CommentsPanel
  }
  if (t === 'likes') {
    panelTitle.value = 'Likes'
    currentPanelComponent.value = LikesPanel
  }
  activePost.value = props.post
}

async function fetchCounts() {
  loading.value = true
  try {
    const { data } = await api.get(`/api/post/${postId}/actions/counts`)
    //console.log(data)
    likesCount.value = data.likesCount
    commentsCount.value = data.commentsCount
    sharesCount.value = data.sharesCount
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

import { EventBus } from 'boot/event-bus'
onMounted(() => {
  fetchCounts()
  EventBus.on('addedComment', () => {
    fetchCounts()
  })
  EventBus.on('successfullyShared', () => {
    sharesCount.value++
  })
})

onBeforeUnmount(() => {
  EventBus.off('addedComment')
  EventBus.off('successfullyShared')
})

async function toggleLike(post) {
  try {
    await api.put(`/posts/${post.id}/togglelike`)

    if (post.likedByMe) {
      likesCount.value--
    } else {
      likesCount.value++
    }

    post.likedByMe = !post.likedByMe
  } catch (err) {
    console.error(err.message)
  }
}

defineExpose({
  toggleLike,
})
</script>

<style scoped>
.like-btn {
  cursor: pointer;
  transition: 0.4s;
  &:active {
    transform: scale(0.2);
  }
}

.handle-close {
  background: grey;
  padding: 3px 10px;
  width: 40px;
  position: absolute;
  top: 5px;
  right: 45%;
  border-radius: 20px;
}
</style>
