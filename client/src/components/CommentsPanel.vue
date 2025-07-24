<template>
  <div :class="$q.screen.width > 1024 ? 'dsk-scroll' : ''" class="comments-container">
    <div v-if="loading" class="comments-list q-pa-md" style="z-index: 0">
      <div v-for="n in 10" :key="n" class="comment-proto">
        <div class="content">
          <div class="avatar">
            <q-skeleton type="circle" width="40px" height="40px" />
          </div>
          <div style="padding-top: 13px" class="header">
            <q-skeleton type="text" width="60%" height="16px" />
            <q-skeleton type="text" width="30%" height="12px" class="q-mt-xs" />
          </div>
          <div class="body">
            <q-skeleton type="text" width="100%" class="q-mb-xs" />
            <q-skeleton type="text" width="76%" class="q-mb-xs" />
            <q-skeleton type="text" width="95%" class="q-mb-xs" />
          </div>
          <div class="actions">
            <q-skeleton type="text" width="40px" height="20px" class="q-ml-xs" />

            <div class="like">
              <i class="fas fa-heart"></i>
              <q-skeleton type="text" width="24px" height="20px" class="q-ml-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <NoItemPlaceholder v-else-if="noItem" style="margin-top: 40%" @reload="fetchComments" />

    <div
      v-else-if="!loading"
      class="comments-list q-pa-md"
      :class="{ 'push-left': replies }"
      style="z-index: 0; margin-bottom: 60px"
    >
      <div v-for="comment in comments" :key="comment.id" class="comment-proto">
        <div class="content">
          <div class="back-icon" v-if="replies" @click="resetComments">
            <i class="material-icons">chevron_left</i>
          </div>
          <div class="avatar" style="position: relative">
            <q-avatar size="40px">
              <img :src="getAvatarSrc(comment.commenter.avatar)" />
            </q-avatar>
          </div>
          <div style="padding-top: 10px" class="header">
            <div>
              <span
                @click="PreviewUser(comment.commenter.id)"
                style="cursor: pointer; font-size: 12px"
              >
                @{{ comment.commenter.username }}
              </span>
            </div>
            <div style="transform: translateY(-3px)">
              <span class="text-grey" style="font-size: 10px">{{
                formatTime(comment.createdAt)
              }}</span>
            </div>
          </div>
          <div class="body">
            {{ comment.comment_body }}
          </div>
          <div class="actions">
            <div>
              <span style="font-size: 11px">{{
                comment.replies.length > 0 ? formatCounts(comment.replies.length) : ''
              }}</span>
              <span
                class="reply-list-btn"
                @click="comment.replies.length ? viewReplies(comment.id) : ''"
              >
                replies <i class="material-icons">chevron_right</i>
              </span>
            </div>
            <span class="reply-btn" @click="startReply(comment.id, comment.commenter.username)"
              ><i style="font-size: 20px" class="material-icons">reply</i></span
            >
            <div class="like" @click="toggleLike(comment.id)">
              <i :style="comment.isLiked ? 'color:red;' : ''" class="material-icons">favorite</i>
              <span style="padding: 0 8px; font-size: 11px">{{
                formatCounts(comment.likesCount)
              }}</span>
            </div>
          </div>
        </div>

        <div v-show="replies" v-for="reply in comment.replies" :key="reply.id">
          <div class="reply_content" style="display: flex; flex-direction: row; padding-left: 45px">
            <div style="glow: 1; padding: 10px">
              <div
                class="avatar"
                style="
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  overflow: hidden;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                "
              >
                <q-avatar size="30px">
                  <img
                    :src="getAvatarSrc(reply.commenter.avatar)"
                    style="width: 100%; height: 100%; object-fit: cover"
                  />
                </q-avatar>
              </div>
            </div>
            <div style="flex: 2">
              <div class="header" style="transform: translateY(5px); display: flex; gap: 0px">
                <div>
                  <span
                    @click="PreviewUser(reply.commenter.id)"
                    style="cursor: pointer; font-size: 10px; font-weight: 500; color: #333"
                  >
                    @{{ reply.commenter.username }}
                  </span>
                </div>
                <div style="transform: translateY(-5px)">
                  <span class="text-grey" style="font-size: 9px; color: #666">
                    {{ formatTime(reply.createdAt) }}
                  </span>
                </div>
              </div>
              <div
                style="margin-top: 4px; font-size: 13px; line-height: 1.5; color: #444"
                v-html="highlightUsernames(reply.comment_body)"
              ></div>
              <div class="actions">
                <div></div>
                <div>
                  <span class="reply-btn" @click="startReply(comment.id, reply.commenter.username)"
                    ><i style="font-size: 20px" class="material-icons">reply</i></span
                  >
                </div>
                <div class="like" @click="toggleLike(reply.id)">
                  <i :style="reply.isLiked ? 'color:red;' : ''" class="material-icons">favorite</i>
                  <span style="padding: 0 8px; font-size: 11px">{{
                    formatCounts(reply.likesCount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
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
          <!-- 🔥 Here’s the fix: -->
          <ProfilePreview :post="{ user: { id: activeUserId } }" />
        </div>
      </q-card>
    </q-dialog>

    <div
      style="position: absolute; bottom: 0; right: 0; width: 100%"
      class="comment-input q-pa-sm"
      :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'"
    >
      <CommentInput
        @replyTerminated="resetReply"
        @commentSent="fetchComments"
        :reply-id="replyId"
        :reply-to="replyTo"
        :post="post"
      />
    </div>
  </div>
</template>

<script setup>
import ProfilePreview from 'components/ProfilePreview.vue'
import CommentInput from './misc/CommentInput.vue'
import { getAvatarSrc, formatTime, formatCounts } from '../composables/formater'
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'

const props = defineProps({
  post: Object,
})

const postId = props.post.id
const noItem = ref(false)
const comments = ref([])
const originalComments = ref([]) // To store the original list of comments
const loading = ref(false)
const replies = ref(false)

const replyId = ref(null)
const replyTo = ref(null)

const activeUserId = ref(null)
const showDrawer = ref(false)
function PreviewUser(id) {
  activeUserId.value = id
  showDrawer.value = true
}

function startReply(id, replyto) {
  replyId.value = id
  replyTo.value = replyto
  const input = document.querySelector('.comment-input input')
  input && input.focus()
}

const fetchComments = async () => {
  loading.value = true
  replies.value = false

  try {
    const { data } = await api.get(`/api/post/${postId}/comments/`)
    comments.value = data
    originalComments.value = [...data] // Store a copy of the fetched comments
    if (data.length === 0) {
      noItem.value = true
    } else {
      noItem.value = false
    }
    //console.log(data)
  } catch (err) {
    noItem.value = true
    console.error(err.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchComments)

function viewReplies(id) {
  const activeComment = comments.value.findIndex((comment) => comment.id === id)
  comments.value.splice(0, comments.value.length, comments.value[activeComment])
  replies.value = true
}

function resetComments() {
  comments.value = [...originalComments.value] // Restore original comments
  replies.value = false // Hide replies
}

function resetReply() {
  replyId.value = null
}

function highlightUsernames(textString) {
  const usernameRegex = /@([a-zA-Z0-9_.]+)/g
  const formattedString = textString.replaceAll(usernameRegex, (match, username) => {
    return `<span style="color: #3bc843c3; font-weight: bold;">@${username}</span>`
  })

  return formattedString
}

async function toggleLike(commentId) {
  try {
    const { data } = await api.post(`/api/comment/${commentId}/toggleLike/`)

    // Update local comment like state
    const comment = comments.value.find((c) => c.id === commentId)
    if (comment) {
      comment.isLiked = data.isLiked
      comment.likesCount = data.likesCount ?? 0
    }

    // Also update if it’s a reply
    comments.value.forEach((comment) => {
      comment.replies.forEach((reply) => {
        if (reply.id === commentId) {
          reply.isLiked = data.isLiked
          reply.likesCount = data.likesCount ?? 0
        }
      })
    })
  } catch (err) {
    console.error('Toggle like failed:', err)
  }
}
</script>

<style scoped lang="scss">
.comments-container {
  display: flex;
  flex-direction: column;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 0; /* no extra bottom padding needed now */
}

.comment-proto {
  position: relative;
  padding-bottom: 16px;
}
.comment-proto .content {
  display: grid;
  grid-template-columns: auto 50px 1fr; /* Added 'auto' for the icon */
  grid-template-rows: auto auto 1fr auto;
  grid-template-areas:
    'back-icon avatar header' /* Added back-icon to grid-template-areas */
    'back-icon avatar header'
    '. avatar body'
    '. avatar actions';
  gap: 0;
}
.comment-proto .back-icon {
  /* New style for the back icon */
  grid-area: back-icon;
  display: flex;
  align-items: center;
  height: 40px;
  cursor: pointer;
}
.comment-proto .avatar {
  grid-area: avatar;
}
.comment-proto .header {
  grid-area: header;
  display: flex;
  flex-direction: column;
}
.comment-proto .body {
  grid-area: body;
  white-space: pre-wrap;
}
.comment-proto .actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reply-list-btn {
  display: inline-flex; // this is the key
  color: #4caf50;
  font-weight: 500;
  cursor: pointer;
  padding-left: 5px;
  font-size: 14px;
  transition: transform 0.1s ease; // optional, makes the scale smooth
  &:active {
    transform: scale(0.9);
  }
}

.reply-btn {
  cursor: pointer;
  &:active {
    transform: scale(0.9);
  }
}
.comment-proto .like {
  display: flex;
  align-items: center;
}
.comment-proto .like i {
  font-size: 15px;
  color: #555;
  cursor: pointer;
  &:active {
    transform: scale(0.9);
  }
}

.dsk-scroll {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.bg-dark {
  background-color: var(--q-dark);
}

.push-left {
  padding-left: 5px;
}
</style>
