<template>
  <q-page style="overflow-y: scroll; height: 90vh">
    <div class="row" style="overflow-y: hidden; height: 100%">
      <div
        id="postsScrollArea"
        @scroll="fetchMorePost"
        class="col-12 col-md-5"
        style="overflow-y: auto; height: 100vh; padding-bottom: 70px"
      >
        <div>
          <div v-if="loading" class="q-px-lg">
            <q-card v-for="n in 5" :key="n" flat bordered style="margin: 10px 0">
              <q-item>
                <q-item-section avatar>
                  <q-skeleton size="40px" type="QAvatar" />
                </q-item-section>

                <q-item-section>
                  <q-item-label>
                    <q-skeleton
                      type="text"
                      height="14px"
                      width="100vw"
                      style="margin-bottom: 4px"
                    />
                  </q-item-label>
                  <q-item-label caption>
                    <q-skeleton type="text" height="14px" width="80%" />
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar />

                <q-item-section class="q-pl-sm">
                  <q-skeleton height="400px" class="q-mb-sm" />

                  <div class="row items-center justify-between no-wrap">
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

                  <q-card-section class="q-pa-sm">
                    <q-skeleton type="text" width="80%" />
                    <q-skeleton type="text" width="60%" class="q-mt-xs" />
                  </q-card-section>
                </q-item-section>
              </q-item>
            </q-card>
          </div>
          <div v-else class="q-px-md">
            <q-virtual-scroll
              scroll-target="#postsScrollArea"
              :items="posts"
              v-slot="{ item: post }"
              virtual-scroll-item-size="300"
            >
              <q-card :key="post.id" flat bordered style="margin: 10px 0">
                <q-item>
                  <q-item-section avatar>
                    <q-avatar @click="openProfilePreview(post.user.id)">
                      <img :src="getAvatarSrc(post.user.avatar)" />
                    </q-avatar>
                  </q-item-section>

                  <q-item-section>
                    <q-item-label style="padding: 0 0 0 8px; margin: 0">
                      <span class="text-grey">@{{ post.user.username }}</span>
                      <span v-if="post.user.id !== userStore.user.id"> • </span>
                      <button
                        v-if="post.user.id !== userStore.user.id"
                        @click="toggleFollow(post.user.id, post.user.isFollowing)"
                        style="border: none; background: none"
                        class="follow-btn-fy text-green"
                      >
                        {{ post.user.isFollowing ? 'Following' : 'Follow' }}
                      </button>
                    </q-item-label>

                    <span style="padding: 0 0 0 8px; font-size: 10px" class="text-grey"
                      >{{ formatTime(post.createdAt) }}
                      <span>
                        <span
                          v-if="post.audience === 'public' || post.audience === 'friends'"
                          style="padding: 0 4px"
                          >•</span
                        >
                        <i v-if="post.audience == 'public'" class="material-icons">public</i>
                        <i v-else-if="post.audience == 'friends'" class="material-icons">people</i>
                      </span>
                    </span>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar />

                  <q-item-section class="q-pl-sm">
                    <div v-if="post.type === 'image' || post.type === 'video'" class="q-mb-sm">
                      <div
                        @click="handlePostDoubleTap(post, $event)"
                        v-if="post.type === 'video'"
                        :style="$q.screen.width >= 1000 ? 'height: 100%; padding: 0 20px;' : ''"
                        class="q-video"
                      >
                        <q-skeleton
                          v-show="!post.videoReady"
                          type="rect"
                          :aspect-ratio="9 / 16"
                          width="100%"
                          height="400px"
                          class="skeleton-overlay"
                        />
                        <CustomVideoPlayer
                          v-show="post.videoReady"
                          :src="post.mediaUrl"
                          :poster="post.thumbnailUrl"
                          @ready="post.videoReady = true"
                        />
                        <transition name="fade-scale">
                          <img
                            v-if="post.showLikeAnimation"
                            src="~assets/anim_heart_2.gif"
                            class="like-animation-heart"
                            :style="{ top: post.animY + 'px', left: post.animX + 'px' }"
                            @load="onGifLoad(post)"
                          />
                        </transition>
                      </div>

                      <div
                        v-if="post.type === 'image'"
                        class="image-container"
                        @click="handlePostDoubleTap(post, $event)"
                      >
                        <img :src="post.mediaUrl" style="width: 100%; border-radius: 8px" />
                        <transition name="fade-scale">
                          <img
                            v-if="post.showLikeAnimation"
                            src="~assets/anim_heart_2.gif"
                            class="like-animation-heart"
                            :style="{ top: post.animY + 'px', left: post.animX + 'px' }"
                            @load="onGifLoad(post)"
                          />
                        </transition>
                      </div>
                    </div>

                    <div class="row items-center justify-between no-wrap">
                      <div class="row items-center">
                        <div
                          style="padding: 0; margin: 0; cursor: pointer"
                          @click="post.comments ? openMeta(post, 'comments') : null"
                        >
                          <q-icon
                            name="far fa-comment"
                            color="grey-4"
                            class="q-mr-sm"
                            size="18px"
                          />

                          <span v-if="post.comments" style="font-size: 12px">{{
                            formatPostCounts(post.commentCounts)
                          }}</span>
                        </div>
                      </div>

                      <div
                        class="row items-center"
                        style="cursor: pointer"
                        @click="openMeta(post, 'share')"
                      >
                        <q-icon name="send" color="grey-4" class="q-mr-sm" size="18px" />
                        <span style="font-size: 12px">{{
                          formatPostCounts(post.shareCounts)
                        }}</span>
                      </div>

                      <div class="row items-center" style="cursor: pointer">
                        <q-icon
                          :name="post.likedByMe ? 'favorite' : 'favorite_border'"
                          :color="post.likedByMe ? 'red' : 'grey-4'"
                          class="q-mr-sm like-btn"
                          size="20px"
                          @click="toggleLike(post)"
                        />
                        <span
                          v-if="post.likeCounts"
                          @click="openMeta(post, 'likes')"
                          style="font-size: 12px"
                          >{{ formatPostCounts(post.likes) }}</span
                        >
                      </div>
                    </div>

                    <q-card-section class="q-pa-sm">
                      <div
                        class="post-body"
                        :class="{ collapsed: !post.showMore }"
                        style="
                          font-size: 12px;
                          transform: translateX(-7px);
                          border-left: 3px solid grey;
                          padding: 0 0 0 4px;
                        "
                      >
                        {{ post.body }}
                      </div>
                      <div v-if="post.body.split('\n').length > 4 || post.body.length > 200">
                        <button class="show-more-btn" @click="toggleShow(post)">
                          {{ post.showMore ? 'less' : 'more' }}
                        </button>
                      </div>
                      <div style="margin-top: 4px">
                        <LikersStackAvatar
                          :post_id="post.id"
                          @click="openMeta(post, 'followed-by-me-who-liked-post')"
                        />

                        <div class="row" style="padding: 3px 0">
                          <q-chip
                            v-for="link in post.linkUrl"
                            :key="link.url"
                            tag="a"
                            :href="link.url"
                            clickable
                            dense
                            style="font-size: 10px; padding: 8px; margin: 0; overflow: hidden"
                            outline
                            class="text-green"
                            icon="link"
                            @click="openMeta(post, 'links')"
                          >
                            {{ link.name }}
                          </q-chip>
                          <q-chip
                            v-for="mention in post.keywords.mentions"
                            :key="mention"
                            clickable
                            style="
                              font-size: 10px;
                              padding: 3px 4px;
                              margin: 0;
                              border: 1px solid #dddddd67;
                              overflow: hidden;
                            "
                            @click="openMeta(post, 'mention')"
                          >
                            <i class="material-icons" style="padding-right: 5px; font-size: 12px"
                              >account_circle</i
                            >
                            {{ mention.username }}
                          </q-chip>
                        </div>
                        <span class="text-grey tags" style="font-size: 12px">
                          <span v-for="tag in post.keywords.tags" :key="tag"> #{{ tag }} </span>
                        </span>
                      </div>
                    </q-card-section>
                  </q-item-section>
                </q-item>
              </q-card>
            </q-virtual-scroll>
            <div v-if="loadingMorePosts" class="flex justify-center q-my-md">
              <q-spinner-dots size="24px" />
            </div>

            <div v-else-if="error" class="text-red text-center q-my-sm">
              Failed to load more posts.
              <q-btn
                :loading="retry"
                flat
                label="Retry"
                @click="
                  () => {
                    fetchPosts()
                    retry = true
                  }
                "
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!isMobile"
        class="col-12 col-md-7"
        style="height: 95vh; overflow: hidden; min-width: 0"
      >
        <template v-if="activePost">
          <component
            :is="currentPanelComponent"
            :post="activePost"
            :key="activePost.id + activeView"
          />
        </template>
        <template v-else>
          <SidePanelDefault />
        </template>
      </div>

      <q-dialog
        v-if="isMobile"
        v-model="showDrawer"
        :maximized="showMaximized"
        position="bottom"
        full-width
        transition-show="slide-up"
        :class="{ 'full-dialog': isVerySmall }"
      >
        <q-card
          :class="{ 'full-card': isVerySmall }"
          :style="[mobileCardStyle, { display: 'flex', flexDirection: 'column' }]"
        >
          <div
            :class="showMaximized ? 'q-mt-md' : ''"
            style="flex: 0 0 auto; position: sticky; top: 0; z-index: 1; padding: 8px"
          >
            <q-btn flat round icon="close" @click="showDrawer = false" />
            <span style="margin-left: 8px">{{ panelTitle }}</span>
          </div>

          <div style="flex: 1 1 auto; overflow-y: auto; padding: 8px">
            <component
              :is="currentPanelComponent"
              :post="activePost"
              :key="activePost.id + activeView"
            />
          </div>
        </q-card>
      </q-dialog>

      <q-dialog
        v-model="showProfilePreviewDrawer"
        :maximized="true"
        position="bottom"
        transition-show="slide-up"
      >
        <q-card style="max-width: 800px" :style="`height: ${$q.screen.height}px;`">
          <div class="q-mt-md" style="position: sticky; top: 0; z-index: 1; padding: 8px">
            <q-btn flat round icon="close" @click="showProfilePreviewDrawer = false" />
            <span style="margin-left: 8px">Profile</span>
          </div>
          <div>
            <ProfilePreview :post="{ user: { id: activeProfileId } }" />
          </div>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import LikersStackAvatar from '../components/misc/LikersStackAvatar.vue'
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useFeedsStore } from 'stores/feedsStore'
import { useUserStore } from 'stores/user'
import CustomVideoPlayer from 'components/VideoPlayer.vue'
import { useQuasar } from 'quasar'
import { formatTime, getAvatarSrc } from '../composables/formater'
import { EventBus } from 'boot/event-bus'
import { getPosts } from 'src/api/posts'
import { throttle } from 'quasar'

//panels to show
import CommentsPanel from 'components/CommentsPanel.vue'
import LikesPanel from 'components/LikesPanel.vue'
import SharePanel from 'components/SharePanel.vue'
import LinksPanel from 'components/LinksPanel.vue'
import MentionPanel from 'components/MentionPanel.vue'
import SidePanelDefault from 'components/SidePanelDefault.vue'
import LikersFollowedByMePanel from 'components/LikersFollowedByMePanel.vue'
import ProfilePreview from 'components/ProfilePreview.vue' // Renamed from PreviewProfile for consistency

const feedsStore = useFeedsStore()
const userStore = useUserStore()

const $q = useQuasar()
const isMobile = computed(() => $q.screen.xs || $q.screen.sm)
const isVerySmall = computed(() => $q.screen.width < 360)
const loading = ref(true)
const loadingMorePosts = ref(false)
const posts = ref([])
const activePost = ref(null)
const activeView = ref(null)
const showDrawer = ref(false) // For comments, likes, etc.
const showMaximized = ref(false) // Still used for the existing dialog for adaptive sizing

// NEW STATE FOR PROFILE PREVIEW
const activeProfileId = ref(null)
const showProfilePreviewDrawer = ref(false)

let lastTap = 0
const DBL_TAP_THRESHOLD = 300

// Map view names to components
const panelMap = {
  comments: CommentsPanel,
  share: SharePanel,
  likes: LikesPanel,
  links: LinksPanel,
  mention: MentionPanel,
  'followed-by-me-who-liked-post': LikersFollowedByMePanel,
  // 'profile-preview' is no longer in this map, as it has its own dialog
}

const panelNames = {
  comments: 'Comments',
  likes: 'Likes',
  share: 'Share',
  links: 'Links',
  mention: 'Mentions',
  'followed-by-me-who-liked-post': 'Your Friends Reaction',
}

const panelTitle = computed(() => {
  return panelNames[activeView.value] || ''
})

// Compute mobile card style for dialog
const mobileCardStyle = computed(() => {
  if (isVerySmall.value) {
    return {
      height: '95vh',
      borderRadius: '0',
    }
  }
  // fallback to drawerHeight or default
  return {
    height: drawerHeight.value,
    borderRadius: '20px 20px 0 0',
  }
})

const panelHeights = {
  comments: '95vh',
  'followed-by-me-who-liked-post': '95vh',
  likes: '95vh',
  shares: 'auto',
  links: 'auto',
  mention: 'auto',
}
const drawerHeight = computed(() => {
  // if you wanna dynamically shrink based on actual content length:
  if (
    (activeView.value === 'comments' || activeView.value === 'likes') &&
    activePost.value?.comments?.length < 3
  ) {
    return '45vh'
  }
  // fallback to the map
  return panelHeights[activeView.value] || 'auto'
})

// Compute which component to render
const currentPanelComponent = computed(() => {
  return panelMap[activeView.value] || null
})

// Function to open the "other" meta dialogs
function openMeta(post, view) {
  // Close profile preview if it's open
  showProfilePreviewDrawer.value = false

  activePost.value = null // Clear previous active post data
  activePost.value = post // Set new active post
  activeView.value = view // Set new view (comments, likes, etc.)

  if (isMobile.value) {
    showDrawer.value = true
    // This dialog is not maximized by default, so showMaximized will remain false for these views
    showMaximized.value = false
  }
}

// NEW FUNCTION TO OPEN PROFILE PREVIEW DIALOG
function openProfilePreview(userId) {
  // Close the "other" meta dialog if it's open
  showDrawer.value = false

  activeProfileId.value = userId
  showProfilePreviewDrawer.value = true
}

const cursor = ref(null)
const limit = ref(10)
const hasMore = ref(true)
const error = ref(false)
const retry = ref(false)

async function fetchPosts(isFirst = false) {
  if (
    (isFirst && loading.value === false) ||
    (!isFirst && loadingMorePosts.value) ||
    !hasMore.value
  ) {
    return
  }

  if (isFirst) {
    loading.value = true
  } else {
    loadingMorePosts.value = true
  }
  try {
    const { data } = await getPosts(cursor.value, limit.value)

    const newPosts = data.posts.map((p) => ({
      ...p,
      showMore: false,
      videoReady: false,
      showLikeAnimation: false,
      animX: 0,
      animY: 0,
    }))

    // Append new posts to existing ones
    posts.value.push(...newPosts)
    if (data.nextCursor == null) {
      hasMore.value = false
    } else {
      cursor.value = data.nextCursor
    }

    //console.log(posts.value)
  } catch (err) {
    console.error('Error fetching posts:', err.message)
    error.value = true
  } finally {
    if (isFirst) loading.value = false
    else loadingMorePosts.value = false
  }
}

onMounted(async () => {
  EventBus.on('successfullyShared', bumpShareCount)
  EventBus.on('addedComment', bumpCommentCount)
  fetchPosts(true)
})

function bumpShareCount(postId) {
  const p = posts.value.find((p) => p.id === postId)
  if (p) {
    p.shareCounts = (p.shareCounts || 0) + 1
  }
}

function bumpCommentCount(postId) {
  const p = posts.value.find((p) => p.id === postId)
  if (p) {
    p.commentCounts = (p.commentCounts || 0) + 1
  }
}

function toggleShow(post) {
  post.showMore = !post.showMore
}

function formatPostCounts(n) {
  if (n >= 1e9) {
    return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  }
  if (n >= 1e6) {
    return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (n >= 1e3) {
    return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return String(n)
}

async function toggleLike(post) {
  try {
    await feedsStore.toggleLike(post.id)

    if (post.likedByMe) {
      // I had it liked, now I’m unliking
      post.likes--
    } else {
      // I hadn’t liked it, now I’m liking
      post.likes++
    }

    post.likedByMe = !post.likedByMe
  } catch (err) {
    console.error(err.message)
  }
}

import { followUser, unfollowUser } from '../api/people'
async function toggleFollow(id, state) {
  try {
    if (state) {
      await unfollowUser(id)
      // Find all posts by the user and set isFollowing to false
      posts.value.forEach((post) => {
        if (post.user.id === id) {
          post.user.isFollowing = false
        }
      })
    } else {
      await followUser(id)
      // Find all posts by the user and set isFollowing to true
      posts.value.forEach((post) => {
        if (post.user.id === id) {
          post.user.isFollowing = true
        }
      })
    }
  } catch (err) {
    console.error(err.message)
  }
}

onMounted(() => {
  EventBus.on('updateFollowBtnState', (id) => {
    posts.value.forEach((post) => {
      if (post.user.id === id) {
        post.user.isFollowing = !post.user.isFollowing
      }
    })
  })
})
onBeforeUnmount(() => {
  EventBus.off('successfullyShared', bumpShareCount)
  EventBus.off('addedComment', bumpCommentCount)
  EventBus.off('updateFollowBtnState')
})

async function onNearBottom(e) {
  const el = e.target
  const dist = el.scrollHeight - (el.scrollTop + el.clientHeight)
  if (dist <= 300) {
    fetchPosts()
  }
}
const fetchMorePost = throttle(onNearBottom, 50)

function handlePostDoubleTap(post, event) {
  const now = Date.now()
  if (now - lastTap < DBL_TAP_THRESHOLD) {
    // Double tap detected
    if (!post.likedByMe) {
      // Only trigger if it's going to be liked (not unliked)
      const imageRect = event.currentTarget.getBoundingClientRect()
      post.animX = event.clientX - imageRect.left - 50 // Adjust -50 to center the GIF
      post.animY = event.clientY - imageRect.top - 50 // Adjust -50 to center the GIF

      post.showLikeAnimation = true
      // The toggleLike will be awaited implicitly if it's an async function.
      // However, we initiate the animation here immediately for responsiveness.
      toggleLike(post)
    } else {
      // If double-tapping an already liked image unlikes it,
      // you might not want the animation. Or you could show a different one.
      toggleLike(post) // Still toggle like
    }
    lastTap = 0 // Reset last tap
  } else {
    lastTap = now
  }
}

// Function to hide the GIF after it finishes playing
function onGifLoad(post) {
  // Assuming the GIF animation duration is around 1 second (1000ms)
  // Adjust this timeout based on the actual duration of your GIF.
  setTimeout(() => {
    post.showLikeAnimation = false
    post.animX = 0 // Reset position
    post.animY = 0
  }, 300) // Hide after 1 second (adjust as needed)
}
</script>

<style scoped lang="scss">
.follow-btn-fy {
  &:active {
    transform: scale(0.94);
    background: #1baa4271;
  }
}

.post-body {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  transition: max-height 0.3s ease;
  white-space: pre-wrap;
  &.collapsed {
    -webkit-line-clamp: 5; // limit to 4 lines
    max-height: calc(1.2em * 5); // roughly 4 lines × line-height
  }
}

.show-more-btn {
  border: none;
  background: none;
  color: green;
  cursor: pointer;
  padding: 0;
}

/* in your <style lang="scss" scoped> */
.tablet-dialog {
  .q-card {
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    height: 80vh; // or whatever you want on tablet
    max-height: 90vh; // cap it
  }
}

/* Hide second column when very small */
.hide-on-very-small {
  display: none !important;
}

/* Full-screen dialog/card for very small */
.full-dialog .q-dialog__inner {
  align-items: stretch;
  justify-content: stretch;
}

.full-card {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
}

/* If you need extra tweaks on root when very small */
.very-small-page {
  /* e.g. reduce padding globally */
}

/* You can also include media queries if needed */
@media (max-width: 359px) {
  /* Any extra fine-tuning for elements */
}

.like-btn {
  cursor: pointer;
  transition: 0.4s;
  &:active {
    transform: scale(0.2);
  }
}

.image-container {
  position: relative; /* Crucial for absolute positioning of the heart */
  display: inline-block; /* Helps prevent extra space below image if needed */
  overflow: hidden; /* Ensures heart doesn't spill out if it scales too big */
  border-radius: 8px; /* Match your image border-radius */
}

.like-animation-heart {
  position: absolute;
  width: 100px; /* Adjust size of your GIF */
  height: 100px; /* Adjust size of your GIF */
  pointer-events: none; /* Allows clicks to pass through to the image */
  transform: translate(-50%, -50%); /* Centers the GIF relative to its own dimensions */
  /* Initial state for transition */
  opacity: 0;
  transform: scale(0.5);
  transition:
    opacity 0.3s ease-out,
    transform 0.3s ease-out; /* Smooth transition */
}

/* Transition classes for Vue's <transition> component */
.fade-scale-enter-active {
  transition: all 0.3s ease-out; /* How it appears */
}
.fade-scale-leave-active {
  transition: all 1.5s cubic-bezier(1, 0.5, 0.8, 1); /* How it disappears */
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.fade-scale-enter-to {
  opacity: 1;
  transform: scale(1.2); /* Slightly larger when it appears */
}
</style>
