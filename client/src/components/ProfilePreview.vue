<template>
  <div class="profile-page">
    <div @scroll="handleScroll" class="profile-wrapper" style="padding-top: 30px">
      <div v-if="loading" class="column items-center text-center q-mb-lg">
        <q-skeleton type="circle" width="120px" height="120px" />
        <q-skeleton type="text" width="40%" class="q-mt-md" />
        <q-skeleton type="text" width="30%" class="q-mt-xs" />
        <q-skeleton type="text" width="60%" class="q-mt-sm" />
        <q-skeleton type="rect" width="25%" class="q-mt-md" />
      </div>
      <div v-else class="column q-mb-lg items-center text-center">
        <q-avatar size="120px">
          <img :src="avatarUrl" :alt="user.name" />
        </q-avatar>
        <div class="text-h5 q-mt-md font-display">
          {{ user.name }}
        </div>
        <div class="text-subtitle2 text-grey q-mt-xs font-display">@{{ user.username }}</div>
        <div class="bio q-mt-sm">
          {{ displayBio }}
          <span v-if="isBioLong" @click="toggleBio" class="bio-toggle-inline">
            {{ showFullBio ? ' Less' : ' More' }}
          </span>
        </div>

        <q-btn
          class="q-mt-md follow-btn"
          :label="buttonLabel"
          :loading="followLoading"
          :disable="followLoading || user.id === userStore.user.id"
          color="primary"
          size="sm"
          @click="toggleFollow"
        />
      </div>

      <div v-if="!loading" class="row justify-around counts-row">
        <div class="column items-center">
          <div class="text-h6">
            {{ user.postsCount }}
          </div>
          <div class="text-caption q-mt-xs">Posts</div>
        </div>
        <div class="column items-center">
          <div class="text-h6">
            {{ user.followingCount }}
          </div>
          <div class="text-caption q-mt-xs">Following</div>
        </div>
        <div class="column items-center">
          <div class="text-h6">
            {{ user.followersCount }}
          </div>
          <div class="text-caption q-mt-xs">Followers</div>
        </div>
      </div>

      <div v-if="!loading" class="tabs-container">
        <q-tabs
          v-model="tab"
          class="text-primary"
          active-color="primary"
          indicator-color="primary"
          dense
        >
          <q-tab name="posts" label="Posts" class="tab-label text-grey" />
          <q-tab name="media" label="Media" class="tab-label text-grey" />
          <q-tab name="contact" label="Contact" class="tab-label text-grey" />
        </q-tabs>

        <q-tab-panels style="margin-top: 10px" v-model="tab" animated>
          <q-tab-panel style="padding: 0" name="posts">
            <div v-if="!user.postsCount" class="text-grey">No posts yet.</div>
            <div v-else>
              <postsTab ref="postsTabRef" :user="user" />
            </div>
          </q-tab-panel>

          <q-tab-panel style="padding: 0" name="media">
            <div v-if="!user.media || user.media.length === 0" class="text-grey">
              No media uploaded.
            </div>
            <div v-else class="media-gallery">
              <div
                v-for="(item, index) in user.media"
                :key="item.id"
                class="media-item"
                @mouseenter="handleVideoHover(index, true)"
                @mouseleave="handleVideoHover(index, false)"
              >
                <q-img
                  v-if="item.type === 'image'"
                  :src="item.mediaUrl"
                  class="media-content"
                  fit="cover"
                  clickable
                  @click="openMediaPreviewer(item.mediaUrl, 'image')"
                />
                <video
                  v-else-if="item.type === 'video'"
                  :src="item.originalMedia"
                  @click="openMediaPreviewer(item.mediaUrl, 'video', item.thumbnailUrl)"
                  muted
                  :poster="item.thumbnailUrl"
                  loop
                  playsinline
                  class="media-content video-item"
                  :ref="
                    (el) => {
                      if (el) videoRefs[index] = el
                    }
                  "
                ></video>
                <div v-if="item.type === 'video'" class="video-overlay">
                  <q-icon name="videocam" color="white" size="24px" />
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="contact">
            <div v-if="!hasContacts" class="text-grey-6 text-center q-pa-md">No contact info.</div>
            <q-list v-else bordered padding class="q-pa-sm">
              <q-item
                v-if="user.contact.phone"
                clickable
                tag="a"
                :href="`tel:${user.contact.phone}`"
              >
                <q-item-section avatar>
                  <q-icon name="phone" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Phone</q-item-label>
                  <q-item-label caption>{{ formattedPhone }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-if="user.contact.blog"
                clickable
                tag="a"
                :href="user.contact.blog"
                target="_blank"
                rel="noopener noreferrer"
              >
                <q-item-section avatar>
                  <q-icon name="web" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Blog</q-item-label>
                  <q-item-label caption>{{ user.contact.blog }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-if="user.contact.twitter"
                clickable
                tag="a"
                :href="twitterUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                <q-item-section avatar>
                  <q-icon name="fab fa-twitter" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Twitter</q-item-label>
                  <q-item-label caption>{{ user.contact.twitter }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="user.email" clickable tag="a" :href="`mailto:${user.email}`">
                <q-item-section avatar>
                  <q-icon name="email" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Email</q-item-label>
                  <q-item-label caption>{{ user.email }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </div>

  <q-dialog
    v-model="previewMedia"
    :maximized="$q.screen.width < 400"
    :position="$q.screen.width < 400 ? 'bottom' : 'standard'"
    class="media-preview-dialog"
  >
    <q-card
      class="media-preview-card"
      :style="mediaCardStyle"
      v-touch-pan.mouse="handlePan"
      ref="mediaCardRef"
    >
      <span class="handle-close" @click="closeMediaPreviewer()"></span>

      <div class="preview-content-wrapper">
        <component :is="currentMediaPreviewer" :src="currentSrc" :poster="videoPoster" />
      </div>

      <template v-if="$q.screen.width >= 400">
        <div class="resizer top-left" @mousedown="startResize('tl')"></div>
        <div class="resizer top-right" @mousedown="startResize('tr')"></div>
        <div class="resizer bottom-left" @mousedown="startResize('bl')"></div>
        <div class="resizer bottom-right" @mousedown="startResize('br')"></div>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup>
import postsTab from 'components/misc/postsTab.vue'
import { ref, onMounted, computed, watch, shallowRef, nextTick } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { useUserStore } from 'stores/user'
import { useSettingsStore } from 'stores/SettingsStore'
import { EventBus } from 'boot/event-bus'

// Import the PreviewImage and PreviewVideo components
import PreviewImage from './misc/PreviewImage.vue' // Adjust path as per your project
import PreviewVideo from './VideoPlayer.vue' // Adjust path as per your project

const props = defineProps({
  post: Object, // Assuming 'post' prop is still relevant for some reason, though 'id' is extracted from it.
})

const settingsStore = useSettingsStore()
const userStore = useUserStore()
const $q = useQuasar()
// Ensure id is reactive if it can change or is part of a route param
const id = ref(props.post ? props.post.user.id : null) // Initialize id safely

const loading = ref(true)
const followLoading = ref(false)
const postsTabRef = ref(null)
const user = ref({
  postsCount: 0,
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
  bio: '',
  media: [], // Initialize media as an empty array
  contact: {}, // Initialize contact as an empty object
})
const tab = ref('posts')
const showFullBio = ref(false)
const previewMedia = ref(false)

const currentMediaPreviewer = shallowRef(null)
const currentSrc = ref(null)
const videoPoster = ref(null)

// For resizable/draggable modal
const mediaCardRef = ref(null)
const mediaCardStyle = ref({})
const isResizing = ref(false)
const resizeDirection = ref('')
const initialMouseX = ref(0)
const initialMouseY = ref(0)
const initialCardWidth = ref(0)
const initialCardHeight = ref(0)
const initialCardLeft = ref(0)
const initialCardTop = ref(0)

// For dragging
const isDragging = ref(false)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

const calculateOptimalMediaSize = (originalWidth, originalHeight) => {
  const viewportWidth = window.innerWidth * 0.9 // Give some padding
  const viewportHeight = window.innerHeight * 0.9 // Give some padding

  let newWidth = originalWidth
  let newHeight = originalHeight

  // If media is wider than viewport
  if (originalWidth > viewportWidth) {
    newWidth = viewportWidth
    newHeight = (originalHeight * newWidth) / originalWidth
  }

  // If media is taller than viewport (after width adjustment)
  if (newHeight > viewportHeight) {
    newHeight = viewportHeight
    newWidth = (originalWidth * newHeight) / originalHeight
  }

  return { width: newWidth, height: newHeight }
}

async function openMediaPreviewer(src, type, poster = null) {
  currentSrc.value = src
  videoPoster.value = poster
  previewMedia.value = true

  await nextTick() // Ensure dialog is rendered

  if ($q.screen.width >= 400) {
    let mediaWidth, mediaHeight

    if (type === 'image') {
      currentMediaPreviewer.value = PreviewImage
      const img = new Image()
      img.src = src
      await new Promise((resolve) => {
        img.onload = () => {
          mediaWidth = img.naturalWidth
          mediaHeight = img.naturalHeight
          resolve()
        }
        img.onerror = () => {
          console.error('Error loading image for dimension calculation.')
          mediaWidth = 600 // Default or fallback
          mediaHeight = 400 // Default or fallback
          resolve()
        }
      })
    } else if (type === 'video') {
      currentMediaPreviewer.value = PreviewVideo
      const video = document.createElement('video')
      video.src = src
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          mediaWidth = video.videoWidth
          mediaHeight = video.videoHeight
          resolve()
        }
        video.onerror = () => {
          console.error('Error loading video metadata for dimension calculation.')
          mediaWidth = 600 // Default or fallback
          mediaHeight = 400 // Default or fallback
          resolve()
        }
      })
    }

    const optimalSize = calculateOptimalMediaSize(mediaWidth, mediaHeight)
    const dialogPadding = 32 // Approx padding of q-dialog
    const cardPadding = 16 // Approx padding within q-card
    const handleCloseHeight = 10 // Approx height of the close handle

    const finalWidth = Math.min(
      optimalSize.width + cardPadding * 2,
      window.innerWidth - dialogPadding * 2,
    )
    const finalHeight = Math.min(
      optimalSize.height + cardPadding * 2 + handleCloseHeight,
      window.innerHeight - dialogPadding * 2,
    )

    mediaCardStyle.value = {
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      maxWidth: `${window.innerWidth - dialogPadding * 2}px`,
      maxHeight: `${window.innerHeight - dialogPadding * 2}px`,
      left: `calc(50% - ${finalWidth / 2}px)`,
      top: `calc(50% - ${finalHeight / 2}px)`,
      position: 'fixed', // Ensure it's positioned absolutely relative to viewport
    }
  } else {
    // For mobile, let Quasar's maximized and position="bottom" handle it
    currentMediaPreviewer.value = type === 'image' ? PreviewImage : PreviewVideo
    mediaCardStyle.value = {} // Clear any desktop-specific styles
  }
}

function closeMediaPreviewer() {
  previewMedia.value = false
  currentSrc.value = null
  videoPoster.value = null
  currentMediaPreviewer.value = null
  mediaCardStyle.value = {} // Reset style
  isDragging.value = false // Reset drag state
  isResizing.value = false // Reset resize state
}

// Ref to store video elements
const videoRefs = ref([])

const avatarUrl = computed(() =>
  user.value.avatar ? `/uploads/${user.value.avatar}` : '/default.png',
)

const buttonLabel = computed(() => (user.value.isFollowing ? 'Unfollow' : 'Follow'))

const isBioLong = computed(() => user.value.bio && user.value.bio.length > 80)
const displayBio = computed(() => {
  if (!isBioLong.value) return user.value.bio
  return showFullBio.value ? user.value.bio : user.value.bio.slice(0, 80) + '...'
})

onMounted(async () => {
  $q.dark.set(settingsStore.dark)
  if (id.value) {
    // Only fetch if id is available

    try {
      const { data } = await api.get(`/users/thisuser/${id.value}`)
      user.value = {
        ...data,
        contact: data.contact || {},
        media: data.media || [], // Ensure media is initialized from fetched data
      }
      loading.value = false
    } catch (err) {
      console.error(err.message)
    }
  } else {
    loading.value = false // If no ID, no loading needed.
  }
})

// Watch for tab changes to pause all videos when switching away from "media" tab
watch(tab, (newTab) => {
  if (newTab !== 'media') {
    videoRefs.value.forEach((video) => {
      if (video) {
        video.pause()
        video.currentTime = 0 // Rewind to start
      }
    })
  }
})

function handleVideoHover(index, isHovering) {
  const video = videoRefs.value[index]
  if (video) {
    if (isHovering) {
      video.play().catch((error) => {
        // Autoplay might be blocked by browsers, handle the error gracefully
        console.warn('Autoplay prevented:', error)
      })
    } else {
      video.pause()
      video.currentTime = 0 // Rewind to start when mouse leaves
    }
  }
}

async function toggleFollow() {
  if (followLoading.value) return
  followLoading.value = true

  const wasFollowing = user.value.isFollowing
  // optimistic UI
  user.value.isFollowing = !wasFollowing
  user.value.followersCount += wasFollowing ? -1 : 1

  try {
    if (wasFollowing) {
      await api.delete(`/users/${id.value}/follow`)
    } else {
      await api.post(`/users/${id.value}/follow`)
    }
    EventBus.emit('updateFollowBtnState', id.value)
    // refresh authoritative state
    const { data } = await api.get(`/users/thisuser/${id.value}`)
    user.value = {
      ...data,
      contact: data.contact || {},
      media: data.media || [],
    }
  } catch (err) {
    // rollback
    user.value.isFollowing = wasFollowing
    user.value.followersCount += wasFollowing ? 1 : -1
    console.error('Follow toggle failed:', err)
  } finally {
    followLoading.value = false
  }
}

function toggleBio() {
  showFullBio.value = !showFullBio.value
}

const hasContacts = computed(() => {
  const c = user.value.contact || {}
  return !!(c.phone || c.blog || c.twitter || user.value.email)
})

const formattedPhone = computed(() => user.value.contact?.phone ?? 'No phone')

const twitterUrl = computed(() => {
  const handle = user.value.contact?.twitter?.replace(/^@/, '')
  return handle ? `https://x.com/${handle}` : ''
})

import { throttle } from 'quasar'

const handleScroll = throttle((e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target
  const distanceToBottom = scrollHeight - scrollTop - clientHeight
  if (distanceToBottom < 300) {
    postsTabRef.value?.fetchPosts()
  }
}, 100)

// Draggable and Resizable Logic (simplified for demonstration)
const handlePan = ({ evt, ...newInfo }) => {
  if ($q.screen.width < 400 || isResizing.value) return // Disable pan for mobile and during resize

  if (newInfo.isFirst) {
    isDragging.value = true
    const cardRect = mediaCardRef.value.$el.getBoundingClientRect()
    dragOffsetX.value = evt.clientX - cardRect.left
    dragOffsetY.value = evt.clientY - cardRect.top
  }

  if (isDragging.value && newInfo.isMoving) {
    const newLeft = evt.clientX - dragOffsetX.value
    const newTop = evt.clientY - dragOffsetY.value

    mediaCardStyle.value.left = `${newLeft}px`
    mediaCardStyle.value.top = `${newTop}px`
  }

  if (newInfo.isFinal) {
    isDragging.value = false
  }
}

const startResize = (direction) => (evt) => {
  if ($q.screen.width < 400) return // Only for desktop
  isResizing.value = true
  resizeDirection.value = direction
  initialMouseX.value = evt.clientX
  initialMouseY.value = evt.clientY

  const cardRect = mediaCardRef.value.$el.getBoundingClientRect()
  initialCardWidth.value = cardRect.width
  initialCardHeight.value = cardRect.height
  initialCardLeft.value = cardRect.left
  initialCardTop.value = cardRect.top

  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
}

const doResize = (evt) => {
  if (!isResizing.value) return

  const dx = evt.clientX - initialMouseX.value
  const dy = evt.clientY - initialMouseY.value

  let newWidth = initialCardWidth.value
  let newHeight = initialCardHeight.value
  let newLeft = initialCardLeft.value
  let newTop = initialCardTop.value

  switch (resizeDirection.value) {
    case 'tl':
      newWidth = initialCardWidth.value - dx
      newHeight = initialCardHeight.value - dy
      newLeft = initialCardLeft.value + dx
      newTop = initialCardTop.value + dy
      break
    case 'tr':
      newWidth = initialCardWidth.value + dx
      newHeight = initialCardHeight.value - dy
      newTop = initialCardTop.value + dy
      break
    case 'bl':
      newWidth = initialCardWidth.value - dx
      newHeight = initialCardHeight.value + dy
      newLeft = initialCardLeft.value + dx
      break
    case 'br':
      newWidth = initialCardWidth.value + dx
      newHeight = initialCardHeight.value + dy
      break
  }

  // Apply minimum size constraints if needed
  const minWidth = 300 // Example min width
  const minHeight = 200 // Example min height

  if (newWidth < minWidth) newWidth = minWidth
  if (newHeight < minHeight) newHeight = minHeight

  mediaCardStyle.value.width = `${newWidth}px`
  mediaCardStyle.value.height = `${newHeight}px`
  mediaCardStyle.value.left = `${newLeft}px`
  mediaCardStyle.value.top = `${newTop}px`
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  width: 100%;
  overflow-y: scroll;
  height: 95vh;
  padding-bottom: 20px;
}

.profile-wrapper {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 16px;
}

.counts-row {
  flex-wrap: wrap;
}

.tabs-container {
  width: 100%;
}

/* New styles for the media gallery */
.media-gallery {
  display: grid;
  /* Adjust minmax(100px, 1fr) for desired minimum item size and responsiveness */
  /* This creates columns that are at least 100px wide, and as many as can fit */
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 2px; /* Small gap between items, like Instagram */
  width: 100%;
}

.media-item {
  position: relative; /* For video overlay positioning */
  width: 100%;
  padding-bottom: 100%; /* Creates a square aspect ratio container */
  overflow: hidden; /* Hide anything that goes outside the square */
}

.media-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* Ensures images/videos fill the container without distortion */
  display: block; /* Remove extra space below images/videos */
}

.video-item {
  /* No specific styles needed here unless you want to override something */
}

.video-overlay {
  position: absolute;
  top: 4px; /* Adjust as needed */
  right: 4px; /* Adjust as needed */
  background-color: rgba(0, 0, 0, 0.4); /* Semi-transparent background for visibility */
  border-radius: 4px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1; /* Ensure it's above the video */
}

/* Existing styles */
.card {
  padding: 16px;
  border-radius: 8px;
  box-shadow: var(--q-shadow-2);
}

.bio {
  font-size: 0.75rem;
  color: gray;
  word-break: break-word;
}

.bio-toggle-inline {
  color: teal;
  cursor: pointer;
  font-weight: bold;
}

.bio {
  white-space: pre-line;
  font-size: 0.75rem;
  color: gray;
  word-break: break-word;
}

.text-grey-6 {
  color: #9e9e9e;
}

@media (min-width: 600px) {
  .profile-wrapper {
    padding: 0;
  }
  .media-gallery {
    /* For larger screens, maybe more columns or larger min-width */
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

.rounded-borders {
  border-radius: 8px;
}

.my-media-card {
  border-radius: 8px;
  overflow: hidden;
}

.handle-close {
  background: grey;
  padding: 3px 10px;
  width: 40px;
  position: absolute;
  top: 5px;
  right: 45%;
  border-radius: 20px;
  cursor: pointer;
  z-index: 10; /* Ensure it's above content */
}

/* Styles for the draggable/resizable modal */
.media-preview-dialog .q-card {
  /* Default styles for desktop modal, overridden by mediaCardStyle */
  position: fixed; /* Important for manual positioning */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  overflow: hidden; /* Hide content overflow during resize */
  padding: 16px; /* Padding for the media inside the card */
  display: flex;
  flex-direction: column;
}

.media-preview-dialog.q-dialog--maximized .q-card {
  /* Override desktop styles for maximized mobile dialog */
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  top: 0 !important;
  left: 0 !important;
  border-radius: 0 !important;
  padding: 10px !important;
}

.preview-content-wrapper {
  flex: 1; /* Allow content to grow */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* Hide scrollbars if content is larger than current card size */
}

.preview-content-wrapper > :deep(img),
.preview-content-wrapper > :deep(video) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* Ensure media fits within the wrapper */
}

/* Resizer handles */
.resizer {
  width: 12px;
  height: 12px;
  background: rgba(0, 0, 0, 0.5); /* Semi-transparent handle */
  position: absolute;
  z-index: 9999; /* Ensure handles are on top */
  border-radius: 50%;
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease-in-out;
}

.media-preview-card:hover .resizer {
  opacity: 1; /* Show on hover */
}

.resizer.top-left {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.resizer.top-right {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.resizer.bottom-left {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
.resizer.bottom-right {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}
</style>
