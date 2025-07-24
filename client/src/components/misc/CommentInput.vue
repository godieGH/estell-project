<template>
  <div class="comment-input-area">
    <div class="text-input-wrapper">
      <button class="icon-button emoji-button">
        <i class="material-icons">emoji_emotions</i>
      </button>

      <textarea
        v-model="newComment"
        class="comment-textarea"
        :placeholder="replyTo ? `Replying to @${replyTo}...` : 'Write a comment...'"
        rows="1"
        @input="autoGrowTextarea"
        ref="commentTextareaRef"
      ></textarea>
    </div>

    <button
      class="send-button"
      :loading="loading"
      :disable="loading || !newComment.trim()"
      :style="loading || !newComment.trim() ? 'opacity: 0.5; cursor: not-allowed;' : ''"
      @click="sendComment"
    >
      <i class="material-icons">send</i>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { EventBus } from 'boot/event-bus'

const emit = defineEmits(['commentSent', 'replyTerminated'])
const props = defineProps({
  post: Object,
  replyId: {
    type: Number,
    default: null,
  },
  replyTo: {
    type: String,
    default: null,
  },
})

// Template Ref for textarea
const commentTextareaRef = ref(null)

const $q = useQuasar()
const newComment = ref('')
const parent_id = ref(null)
const loading = ref(false)
const postId = props.post.id

// Methods
const autoGrowTextarea = () => {
  const textarea = commentTextareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }
}

// Watch for changes in replyId from the parent
watch(
  () => props.replyId,
  (newId) => {
    parent_id.value = newId
    if (newId !== null) {
      newComment.value = `@${props.replyTo} `
      nextTick(() => {
        autoGrowTextarea() // Adjust textarea height after content changes
        // Optionally, focus the textarea when entering reply mode
        commentTextareaRef.value?.focus()
      })
    } else {
      // If replyId becomes null (reply terminated from parent), clear the comment input
      newComment.value = ''
      nextTick(() => {
        autoGrowTextarea() // Reset textarea height
      })
    }
  },
  { immediate: true }, // Run immediately on component mount to set initial state
)

// Watch newComment to determine if reply mode should be terminated by user action
watch(newComment, (newVal) => {
  // If we are in reply mode (parent_id is set) and the input is completely empty,
  // then the user likely wants to cancel the reply and write a main comment.
  if (parent_id.value !== null && newVal.trim() === '') {
    emit('replyTerminated')
  }
})

async function sendComment() {
  if (!newComment.value.trim()) return
  if (newComment.value.length > 280) {
    $q.notify({
      color: 'orange',
      message: 'Too long comment, You should only type 280 characters or less',
    })
    return
  }
  loading.value = true
  try {
    await api.post(`/api/put/post/${postId}/comment`, {
      q: newComment.value.trim(),
      parent_id: parent_id.value,
    })
    emit('commentSent')
    EventBus.emit('addedComment', postId)
    // After sending, reset the internal parent_id for the next input,
    // and also signal the parent to reset its replyId/replyTo.
    parent_id.value = null
    emit('replyTerminated') // This will also cause the parent to reset its replyId
  } catch (err) {
    console.error(err)
    // You might want to show a notification here for the user if the send fails
    $q.notify({
      color: 'negative',
      message: 'Failed to send comment. Please try again.',
    })
  } finally {
    loading.value = false
  }
  newComment.value = ''
  nextTick(() => {
    autoGrowTextarea() // Reset textarea height after clearing content
  })
}

// Lifecycle Hooks
onMounted(() => {
  autoGrowTextarea() // Initial height adjustment on mount
})
</script>

<style scoped>
.comment-input-area {
  display: flex;
  align-items: flex-end; /* Align items to the bottom */
  padding: 5px;
  background-color: #f5f5f5;
  border-top: 1px solid #eee;
  gap: 5px;
  position: relative;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s ease;
  color: #555;
}

.icon-button:active {
  background-color: #e0e0e0;
  transform: scale(0.9);
}

.icon-button .material-icons {
  font-size: 24px;
}

.text-input-wrapper {
  flex-grow: 1;
  position: relative;
  display: flex;
  align-items: center; /* Align items to the bottom */
  background-color: #fff;
  border-radius: 20px;
  border: 1px solid #ddd;
  color: var(--q-dark);
  overflow: hidden;
  min-height: 40px; /* Ensure a minimum height for the wrapper */
  padding: 5px; /* Internal padding for wrapper */
}

/* Specific style for the emoji button inside text-input-wrapper */
.text-input-wrapper .emoji-button {
  flex-shrink: 0; /* Prevent it from shrinking */
  margin-right: 5px; /* Space between emoji button and text content */
  padding: 5px;
}

.comment-textarea {
  flex-grow: 1;
  border: none;
  outline: none;
  padding: 0; /* Remove internal padding, let container handle it */
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  min-height: 20px;
  max-height: 120px; /* Max height before scrollbar appears */
  overflow-y: auto;
  box-sizing: border-box;
  color: inherit; /* Ensure text color respects dark mode if $q.dark.isActive is used elsewhere */
  background: transparent; /* Ensure background is transparent */
}

/* Scrollbar styles for webkit browsers */
.comment-textarea::-webkit-scrollbar {
  width: 6px;
}

.comment-textarea::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.comment-textarea::-webkit-scrollbar-track {
  background-color: #f9f9f9;
}

.send-button {
  border: none;
  border-radius: 50%;
  display: flex;
  padding: 10px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s ease;
  flex-shrink: 0;
  background-color: transparent; /* Ensure button itself doesn't have a background */
}

.send-button:active {
  transform: scale(0.9);
}

.send-button .material-icons {
  font-size: 24px;
  color: green; /* Default color for send icon */
}

/* Style for disabled send button icon */
.send-button[disabled] .material-icons {
  color: #ddd !important; /* Use !important to override default color */
}
</style>
