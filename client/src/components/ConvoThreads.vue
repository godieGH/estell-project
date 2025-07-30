<template>
  <div
    :style="$q.screen.lt.md ? 'height: calc(100dvh - 60px);' : ''"
    id="chatBubbleScrollArea"
    ref="chatContainer"
    class="q-pa-sm chat-container"
    @scroll="handleScroll"
  >
    <q-virtual-scroll
      ref="virtualScroll"
      scroll-target="#chatBubbleScrollArea"
      :items="groupedMessages"
      v-slot="{ item: message }"
      virtual-scroll-item-size="35"
    >
      <div
        :ref="message.notReadByMe && !message.isMine ? 'notReadbyMeRef' : null"
        :key="message.id"
        :data-message-id="message.id"
        v-touch-hold="(event) => {showBubbleAction(event, message)}"
      >
        <div
          v-if="message.type === 'date_separator'"
          class="message-system text-center text-caption text-grey-6"
        >
          {{ date.formatDate(new Date(message.date), 'Do MMM, YYYY') }}
        </div>

        <div
          v-else-if="message.type === 'unread_separator'"
          class="message-system text-center text-caption text-grey-6"
        >
          unread messages
        </div>

        <div
          v-else-if="message.sender_type === 'system'"
          class="message-system text-center text-caption text-grey-6"
        >
          {{ message.content.text }}
        </div>

        <div
          v-else
          :class="message.isMine ? 'message-mine-wrapper' : 'message-other-wrapper'"
          class="row items-start no-wrap"
        >
          <q-avatar v-if="!message.isMine && message.showAvatar && !message.is_deleted" size="md">
            <img :src="getAvatarSrc(message.sender.avatar) || 'default.png'" />
          </q-avatar>
          <div
            v-else-if="!message.isMine && !message.showAvatar"
            :style="!message.is_deleted ? 'width: 35px;' : ''"
          ></div>

          <div
            :class="message.isMine ? 'message-bubble message-mine' : 'message-bubble message-other'"
            class="q-pa-sm q-ma-xs"
          >
            <div v-if="message.reply_to_message" class="reply-bubble">
              <div class="text-caption text-blue-8 text-bold">
                Replying to
                {{
                  message.isMine
                    ? message.reply_to_message.isMine
                      ? 'Yourself'
                      : message.reply_to_message.sender_name
                    : message.reply_to_message.isMine
                      ? message.reply_to_message.sender_name
                      : 'Yourself'
                }}
              </div>
              <div class="text-caption text-grey-7 ellipsis">
                {{
                  message.reply_to_message.content_text ||
                  (message.reply_to_message.content_attachment_type
                    ? `[${message.reply_to_message.content_attachment_type}]`
                    : '') ||
                  (message.reply_to_message.content_voice_note ? '[Voice Note]' : '')
                }}
              </div>
            </div>

            <div
              v-if="message.content.attachment_type === 'image'"
              style="position: relative"
              :style="{
                width: '220px',
                height: `calc(220px * ${message.content.attachment_metadata?.height} / ${message.content.attachment_metadata?.width} )`,
              }"
              class="attachment-top"
            >
              <div v-if="message.queued && message.isMine" class="attachment-queued-overlay">
                <q-btn flat size="30px" style="color: white" loading></q-btn>
              </div>
              <q-img :src="message.content.attachment" class="message-image" />
            </div>

            <div
              v-if="message.content.attachment_type === 'video'"
              style="position: relative"
              :style="{
                width: '220px',
                height: `calc(220px * ${message.content.attachment_metadata?.height} / ${message.content.attachment_metadata?.width})`,
              }"
              class="attachment-top"
            >
              <div v-if="message.queued && message.isMine" class="attachment-queued-overlay">
                <q-btn flat size="30px" style="color: white" loading></q-btn>
              </div>
              <CustomVideoPlayer :src="message.content.attachment" />
            </div>

            <div
              v-if="message.content.attachment_type === 'file'"
              class="file-type-attachment attachment-top"
            >
              <div class="file-icon">
                <q-icon
                  :name="getIconForFileType(message.content.attachment_metadata)"
                  :style="{
                    'font-size': '25px',
                    color: getIconColorForFileType(message.content.attachment_metadata),
                  }"
                  class="icons"
                />
              </div>
              <div class="file-meta">
                <div class="file-name">
                  {{
                    message.content.attachment?.split('/')[
                      message.content.attachment?.split('/').length - 1
                    ]
                  }}
                </div>
                <div class="meta">
                  <span>
                    {{
                      message.content.attachment_metadata?.pages
                        ? `${message.content.attachment_metadata?.pages} pages • `
                        : message.content.attachment_metadata?.duration
                          ? `${Math.trunc(message.content.attachment_metadata?.duration)}s • `
                          : '   '
                    }}
                  </span>

                  <span>{{ formatFileSize(message.content.attachment_metadata?.size) }} • </span>
                  <span>
                    {{
                      message.content.attachment_metadata?.type === 'document' ||
                      message.content.attachment_metadata?.type === 'application'
                        ? message.content.attachment_metadata?.subtype
                        : message.content.attachment_metadata?.type === 'video' ||
                            message.content.attachment_metadata?.type === 'image' ||
                            message.content.attachment_metadata?.type === 'audio' ||
                            message.content.attachment_metadata?.type === 'text'
                          ? message.content.attachment_metadata?.mime_type.split('/')[1]
                          : ''
                    }}
                  </span>
                </div>
              </div>
              <div class="download-icon">
                <span v-if="message.isMine && message.queued">
                  <q-icon name="file_upload" style="font-size: 20px" class="icons" />
                </span>
                <span v-else-if="!message.isMine">
                  <template v-if="downloadingMessageId === message.id">
                    <video src="~assets/download-anim.mp4" autoplay loop style="width: 28px" />
                  </template>
                  <template v-else>
                    <q-icon
                      name="file_download"
                      style="font-size: 20px; cursor: pointer"
                      class="icons"
                      @click="
                        downloadFile(
                          message.id,
                          message.content.attachment,
                          message.content.attachment?.split('/').pop(),
                        )
                      "
                    />
                  </template>
                </span>
                <span v-else>
                  <q-icon name="done" style="font-size: 20px" class="icons" />
                </span>
              </div>
            </div>

            <div v-if="message.content.voice_note" class="attachment-top">
              <div class="voice-note-player row items-center no-wrap q-gutter-xs">
                <q-btn
                  :icon="
                    currentPlayingVoiceNoteId === message.id && isPlaying ? 'pause' : 'play_arrow'
                  "
                  flat
                  dense
                  round
                  @click="toggleVoiceNotePlay(message.id, message.content.voice_note)"
                />
                <div
                  class="voice-note-waveform"
                  :style="{
                    width: '100px',
                    height: '30px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '5px',
                  }"
                  @click="seekVoiceNote($event, message.id)"
                >
                  <div
                    v-if="currentPlayingVoiceNoteId === message.id"
                    class="waveform-progress"
                    :style="{ width: voiceNoteProgress + '%' }"
                  ></div>
                  <div v-else class="waveform-static"></div>
                </div>
                <div style="font-size: 10px" class="voice-note-time text-caption text-grey-6">
                  {{
                    currentPlayingVoiceNoteId === message.id
                      ? formatDuration(voiceNoteCurrentTime)
                      : formatDuration(voiceNoteDurations[message.id] || 0)
                  }}
                  | {{ formatDuration(voiceNoteDurations[message.id] || 0) }}
                </div>
              </div>
            </div>

            <div
              v-if="message.content.text"
              :class="{ 'text-grey': message.is_deleted }"
              class="message-text-content"
            >
              <span v-if="message.is_deleted && !message.isMine">
                <span class="material-icons">do_not_disturb</span> This message was deleted.
              </span>
              <span style="white-space: pre-wrap" v-else>
                {{ message.content.text }}
              </span>
            </div>

            <div
              v-if="!message.is_deleted"
              :class="message.isMine ? 'text-right' : 'text-left'"
              style="font-size: 10px"
              class="text-caption text-grey-5 message-timestamp"
            >
              <span
                v-if="message.isMine && message.queued"
                class="q-pr-xs material-icons"
                style="font-size: 14px"
                >schedule</span
              >
              <span
                v-if="
                  message.isMine &&
                  !message.queued &&
                  message.read_by &&
                  message.read_by.length > 0 &&
                  checkReadBy(message.read_by)
                "
                class="text-blue q-pr-xs material-icons"
                style="font-size: 14px"
                >done_all</span
              >
              <span
                v-else-if="message.isMine && !message.queued"
                class="q-pr-xs material-icons"
                style="font-size: 14px"
                >done</span
              >
              {{ formatTime(message.sent_at) }}
            </div>
          </div>
        </div>
      </div>
    </q-virtual-scroll>

    <div
      v-if="showGodownBtn"
      class="go-down-btn"
      style="position: absolute; bottom: 70px; right: 10px; z-index: 999999"
    >
      <q-btn
        @click="() => { scrollToBottom(); showBubbleActionContainer = false}"
        class="q-py-md q-ma-xs"
        style="font-size: 12px; color: #333"
        :style="$q.dark.isActive ? 'background: grey;' : 'background: #ffffff;'"
        rounded
        icon="fas fa-chevron-down"
      />
    </div>
    
    
    
    
    
<transition name="chat-bubble-fade">
  <div v-if="showBubbleActionContainer" class="chat-bubble-action-container" >
    <div class="blur-overlay" @click="showBubbleActionContainer = false"></div>
    <div class="chat-bubble-actions" :style="bubbleActionContainerStyle">
      <div>Reply to</div>
      <div v-if="selectedMsg.isMine">Delete</div>
      <div v-else>Hide</div>
      <div v-if="selectedMsg.isMine && (Date.now() - (new Date(selectedMsg?.updated_at)).getTime()) < 120000 || (Date.now() - parseInt(selectedMsg.sent_at) < 120000 )">Edit</div>
      <div v-if="selectedMsg.content.text" @click="copyText(selectedMsg.content.text)">Copy text</div>
      <div>Share</div>
    </div>
  </div>
</transition>




    
    
    
    
  </div>
</template>
<script setup>
import CustomVideoPlayer from 'components/VideoPlayer.vue'
import { ref, computed, onUnmounted, watch, onMounted, nextTick } from 'vue'
import { socket } from 'boot/socket'
import { api } from 'boot/axios'
import { date, useQuasar } from 'quasar'
import { useUserStore } from 'stores/user'
import { useMessageStore } from 'stores/messageStore'
import { useMsgStore } from 'stores/messages'
import { formatFileSize, getAvatarSrc } from 'src/composables/formater'
import { EventBus } from 'boot/event-bus'

const messageStore = useMessageStore()
const imbMsg = useMsgStore()
const props = defineProps({
  currentConversation: Object,
})
const userStore = useUserStore()
const $q = useQuasar()

const notReadbyMeRef = ref(null)
let observer

const messages = ref([])

function checkReadBy(readByArray) {
  if (readByArray.length === 0) {
    return false
  }

  for (let i = 0; i < readByArray.length; i++) {
    if (readByArray[i] !== userStore.user.id) {
      return true
    }
  }

  return false
}

async function fetchHistMsg() {
  try {
    const { data } = await api.get(`/api/get/msgs/${props.currentConversation.id}/`)
    messages.value = [...data]
    //console.log(data)
  } catch (err) {
    console.error(err.message)
  }
}

watch(
  messageStore.queued,
  (newMsgs) => {
    //console.log(newMsgs)
    if (newMsgs.length > 0) {
      const queuedMsgs = messageStore.queued.filter((msg) => {
        return msg.conversation_id === props.currentConversation.id
      })
      messages.value = [...new Set([...messages.value, ...queuedMsgs])]
    }
  },
  { deep: true },
)

onMounted(async () => {
  imbMsg.initializeStore()
  await fetchHistMsg()

  if (messageStore.queued.length > 0) {
    const queuedMsgs = messageStore.queued.filter((msg) => {
      return msg.conversation_id === props.currentConversation.id
    })

    //console.log(queuedMsgs)
    messages.value = [...new Set([...messages.value, ...queuedMsgs])]
  }

  socket.on('new_msg', recieveNew)
  socket.on('someone_raed_msg', someone_raed_msg)

  observer = new IntersectionObserver(
    async ([entry]) => {
      if (entry.isIntersecting && entry.target.dataset.messageId) {
        const readMsgIndex = messages.value.findIndex(
          (msg) => msg.id === entry.target.dataset.messageId,
        )
        const readMsg = messages.value.find((msg) => msg.id === entry.target.dataset.messageId)
        if (Number.isInteger(readMsgIndex)) {
          //messages.value[readMsg].read_by.push(userStore.user.id)
          try {
            await api.post(
              `/api/read/msg/${messages.value[readMsgIndex].conversation_id}/${entry.target.dataset.messageId}/`,
            )
            socket.emit('read_msg', { msgId: readMsg.id, convoId: readMsg.conversation_id })
            observer.unobserve(entry.target)
          } catch (e) {
            console.error(e.message)
          }
        }
      }
    },
    {
      threshold: 0.9,
    },
  )

  EventBus.on('area-focus', () => {
    scrollToBottom()
  })
})

async function recieveNew(msg) {
  if (msg.conversation_id !== props.currentConversation.id) return

  const newMsg = {
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    sender_type: msg.sender_type,
    content: msg.content,
    sent_at: msg.sent_at,
    updated_at: msg.updated_at,
    isMine: msg.sender_id === userStore.user.id,
    is_deleted: msg.is_deleted,
    is_edited: msg.is_edited,
  }

  try {
    if (msg.sender_type === 'user') {
      const senderResponse = await api.get(`/api/get/user/${msg.sender_id}`)
      newMsg.sender = senderResponse.data // Assuming your API returns data in .data
    }
  } catch (error) {
    console.error('Error fetching sender details:', error)
    newMsg.sender = null
  }

  if (newMsg.sender_type === 'system' && newMsg.content && newMsg.content.type === 'initial_msg') {
    messages.value.unshift(newMsg)
  } else {
    messages.value.push(newMsg)
  }
}

function someone_raed_msg() {
  fetchHistMsg()
}

const virtualScroll = ref(null)
const chatContainer = ref(null)

const currentAudio = ref(null)
const currentPlayingVoiceNoteId = ref(null)
const isPlaying = ref(false)
const voiceNoteCurrentTime = ref(0)
const voiceNoteDurations = ref({})
const voiceNoteProgress = ref(0)

const formatTime = (timestamp) => {
  return date.formatDate(timestamp, 'HH:mm')
}

const formatDuration = (seconds) => {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '00:00' // Handle NaN or Infinity durations
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

const toggleVoiceNotePlay = async (messageId, url) => {
  if (currentAudio.value && currentPlayingVoiceNoteId.value === messageId) {
    // If clicking the same voice note, toggle play/pause
    if (isPlaying.value) {
      currentAudio.value.pause()
    } else {
      await currentAudio.value.play().catch((e) => console.error('Error playing voice note:', e))
    }
    isPlaying.value = !isPlaying.value
  } else {
    // If clicking a different voice note or no voice note is playing, stop current and play new
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value.currentTime = 0
    }

    currentAudio.value = new Audio(url)
    currentPlayingVoiceNoteId.value = messageId
    isPlaying.value = true
    voiceNoteCurrentTime.value = 0
    voiceNoteProgress.value = 0

    currentAudio.value.addEventListener('timeupdate', () => {
      voiceNoteCurrentTime.value = currentAudio.value.currentTime
      if (voiceNoteDurations.value[messageId]) {
        voiceNoteProgress.value =
          (currentAudio.value.currentTime / voiceNoteDurations.value[messageId]) * 100
      }
    })

    currentAudio.value.addEventListener('ended', () => {
      isPlaying.value = false
      currentPlayingVoiceNoteId.value = null
      voiceNoteCurrentTime.value = 0
      voiceNoteProgress.value = 0
    })

    currentAudio.value.addEventListener('loadedmetadata', () => {
      // Ensure duration is a valid number before storing
      const duration = currentAudio.value.duration
      if (!isNaN(duration) && isFinite(duration)) {
        voiceNoteDurations.value = {
          ...voiceNoteDurations.value,
          [messageId]: duration,
        }
      } else {
        console.warn(
          `Could not get valid duration for voice note ${messageId}. Duration: ${duration}`,
        )
        voiceNoteDurations.value = {
          ...voiceNoteDurations.value,
          [messageId]: 0, // Set to 0 or a sensible default
        }
      }
    })

    // Handle potential errors when loading the audio
    currentAudio.value.addEventListener('error', (e) => {
      console.error('Error loading audio:', e)
      // You might want to display an error message to the user
      isPlaying.value = false
      currentPlayingVoiceNoteId.value = null
      voiceNoteCurrentTime.value = 0
      voiceNoteProgress.value = 0
      voiceNoteDurations.value = {
        ...voiceNoteDurations.value,
        [messageId]: 0, // Reset duration
      }
    })

    await currentAudio.value.play().catch((e) => console.error('Error playing voice note:', e))
  }
}

const seekVoiceNote = (event, messageId) => {
  // Add a check to ensure the duration is valid before seeking
  if (
    isNaN(voiceNoteDurations.value[messageId]) ||
    !isFinite(voiceNoteDurations.value[messageId])
  ) {
    console.warn(`Cannot seek voice note ${messageId}: duration is invalid.`)
    return
  }

  const waveformElement = event.currentTarget
  const clickX = event.offsetX // X-coordinate of the click relative to the element
  const totalWidth = waveformElement.offsetWidth // Total width of the waveform element

  const seekPercentage = clickX / totalWidth
  const seekTime = voiceNoteDurations.value[messageId] * seekPercentage

  if (currentAudio.value && currentPlayingVoiceNoteId.value === messageId) {
    currentAudio.value.currentTime = seekTime
  } else {
    // If not currently playing, start playing from the seeked position
    const message = messages.value.find((msg) => msg.id === messageId)
    if (message && message.content.voice_note) {
      toggleVoiceNotePlay(messageId, message.content.voice_note).then(() => {
        if (currentAudio.value) {
          currentAudio.value.currentTime = seekTime
        }
      })
    }
  }
}

onUnmounted(() => {
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value = null
  }
  socket.off('new_msg', recieveNew)
  socket.off('someone_raed_msg', someone_raed_msg)
  if (observer) {
    // Make sure observer is defined before disconnecting
    observer.disconnect()
  }

  EventBus.off('area-focus')
})

const groupedMessages = computed(() => {
  if (!messages.value || messages.value.length === 0) {
    return []
  }

  const processed = []
  let lastDate = null
  let unreadSeparatorAdded = false
  const sortedMessages = [...messages.value].sort(
    (a, b) => new Date(a.sent_at) - new Date(b.sent_at),
  )

  for (let i = 0; i < sortedMessages.length; i++) {
    const currentMessage = { ...sortedMessages[i] }

    const currentMessageDate = date.formatDate(currentMessage.sent_at, 'YYYY-MM-DD')
    if (currentMessageDate !== lastDate) {
      processed.push({
        id: `separator-${currentMessageDate}`,
        type: 'date_separator',
        date: currentMessage.sent_at,
      })
      lastDate = currentMessageDate
    }

    if (currentMessage.sender_type === 'user') {
      let showAvatar = false
      const previousMessage = i > 0 ? sortedMessages[i - 1] : null

      if (
        !previousMessage ||
        currentMessage.sender_id !== previousMessage.sender_id ||
        previousMessage.sender_type === 'system'
      ) {
        showAvatar = true
      }
      currentMessage.showAvatar = showAvatar
    }

    currentMessage.isMine = currentMessage.sender_id === userStore.user.id

    if (!currentMessage.isMine) {
      currentMessage.notReadByMe =
        !currentMessage.read_by || !currentMessage.read_by.includes(userStore.user.id)
    } else {
      currentMessage.notReadByMe = false
    }

    if (
      !unreadSeparatorAdded &&
      !currentMessage.isMine &&
      currentMessage.sender_type === 'user' &&
      !currentMessage.read_by?.includes(userStore.user.id)
    ) {
      processed.push({
        id: `unread-separator-${currentMessage.id}`,
        type: 'unread_separator',
        date: currentMessage.sent_at,
        content: { text: 'unread messages' },
      })
      unreadSeparatorAdded = true
    }

    processed.push(currentMessage)
  }

  return processed
})

let isFistMounted
const scrollToBottom = () => {
  if (virtualScroll.value && groupedMessages.value.length > 0) {
    if (isFistMounted) {
      const x = groupedMessages.value.findIndex((msg) => {
        return (
          !msg.isMine && msg.sender_type === 'user' && !msg.read_by?.includes(userStore.user.id)
        )
      })

      if (x >= 0) {
        virtualScroll.value.scrollTo(x - 1, 0)
        isFistMounted = false
      } else {
        virtualScroll.value.scrollTo(groupedMessages.value.length - 1, 0)
      }
      return
    }
    virtualScroll.value.scrollTo(groupedMessages.value.length - 1, 0)
  }
}

watch(
  groupedMessages,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true },
)

onMounted(() => {
  isFistMounted = true
  nextTick(() => {
    scrollToBottom()
  })
})

const getIconForFileType = (metadata) => {
  if (!metadata) {
    return 'far fa-file'
  }

  const { type, subtype, mime_type } = metadata

  switch (type) {
    case 'image':
      return 'fas fa-file-image'
    case 'video':
      return 'fas fa-file-video'
    case 'audio':
      return 'fas fa-file-audio'
    case 'document':
    case 'application':
      if (subtype === 'pdf' || mime_type === 'application/pdf') {
        return 'fas fa-file-pdf'
      } else if (
        subtype === 'word' ||
        mime_type === 'application/msword' ||
        mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return 'fas fa-file-word'
      } else if (
        subtype === 'excel' ||
        mime_type === 'application/vnd.ms-excel' ||
        mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        return 'fas fa-file-excel'
      } else if (
        subtype === 'powerpoint' ||
        mime_type === 'application/vnd.ms-powerpoint' ||
        mime_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
        return 'fas fa-file-powerpoint'
      } else if (
        subtype === 'zip' ||
        mime_type === 'application/zip' ||
        mime_type === 'application/x-zip-compressed'
      ) {
        return 'fas fa-file-archive'
      } else if (mime_type === 'text/csv') {
        return 'fas fa-file-csv'
      }
      return 'fas fa-file-alt'
    case 'text':
      if (mime_type === 'text/plain') {
        return 'fas fa-file-alt'
      } else if (mime_type === 'text/html') {
        return 'fas fa-file-code'
      } else if (mime_type === 'text/css') {
        return 'fas fa-file-code'
      } else if (mime_type === 'text/javascript') {
        return 'fas fa-file-code'
      }
      return 'fas fa-file-alt'
    default:
      return 'far fa-file'
  }
}

const getIconColorForFileType = (metadata) => {
  if (!metadata) {
    return '#808080'
  }

  const { type, subtype, mime_type } = metadata

  const colorMap = {
    pdf: '#E4002B',
    word: '#2B579A',
    excel: '#217346',
    powerpoint: '#D24726',
    zip: '#808080',
    image: '#007ACC',
    video: '#8A2BE2',
    audio: '#00BFFF',
    csv: '#217346',
    html: '#E34F26',
    css: '#1572B6',
    javascript: '#F7DF1E',
    text: '#808080',
  }

  if (subtype && colorMap[subtype]) {
    return colorMap[subtype]
  }
  if (mime_type && mime_type.includes('pdf') && colorMap['pdf']) {
    return colorMap['pdf']
  }
  if (mime_type && mime_type.includes('wordprocessingml') && colorMap['word']) {
    return colorMap['word']
  }
  if (mime_type && mime_type.includes('spreadsheetml') && colorMap['excel']) {
    return colorMap['excel']
  }
  if (mime_type && mime_type.includes('presentationml') && colorMap['powerpoint']) {
    return colorMap['powerpoint']
  }
  if (mime_type && mime_type.includes('zip') && colorMap['zip']) {
    return colorMap['zip']
  }
  if (mime_type && mime_type.includes('csv') && colorMap['csv']) {
    return colorMap['csv']
  }
  if (mime_type && mime_type.includes('html') && colorMap['html']) {
    return colorMap['html']
  }
  if (mime_type && mime_type.includes('css') && colorMap['css']) {
    return colorMap['css']
  }
  if (mime_type && mime_type.includes('javascript') && colorMap['javascript']) {
    return colorMap['javascript']
  }

  if (type && colorMap[type]) {
    return colorMap[type]
  }

  return '#808080'
}

const downloadingMessageId = ref(null)

const downloadFile = async (messageId, fileUrl, fileName) => {
  downloadingMessageId.value = messageId

  try {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = fileName || 'download'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    downloadingMessageId.value = null
  } catch (error) {
    console.error('Error during file download:', error)
    $q.notify({ message: `Error during file download: ${error.message}` })
    downloadingMessageId.value = null
  }
}

watch(
  notReadbyMeRef,
  (newValue, oldValue) => {
    if (newValue && observer) {
      if (oldValue && oldValue !== newValue) {
        observer.unobserve(oldValue)
      }
      observer.observe(newValue)
    } else if (!newValue && oldValue && observer) {
      observer.unobserve(oldValue)
    }
  },
  { immediate: true },
)

const showGodownBtn = ref(false)
const getDistanceFromBottom = () => {
  if (chatContainer.value) {
    const scrollHeight = chatContainer.value.scrollHeight
    const clientHeight = chatContainer.value.clientHeight
    const scrollTop = chatContainer.value.scrollTop

    const distanceFromBottom = scrollHeight - clientHeight - scrollTop
    return distanceFromBottom
  }
  return null
}

function handleScroll() {
  if (getDistanceFromBottom() > 250) {
    showGodownBtn.value = true
  } else {
    showGodownBtn.value = false
  }
}


const showBubbleActionContainer = ref(false)
const bubbleActionContainerStyle = ref({})
const selectedMsg = ref(null)

function showBubbleAction(event, msg) {
  selectedMsg.value = msg
 
  const messageBubbleElement = event.evt.touches[0].target.closest('.message-bubble');
  if (!messageBubbleElement) return;

  const containerRect = chatContainer.value.getBoundingClientRect();
  const bubbleRect = messageBubbleElement.getBoundingClientRect();

  // Calculate desired position relative to the chatContainer
  let top = bubbleRect.top - containerRect.top;
  let left = bubbleRect.left - containerRect.left;

  // Define the dimensions of the action menu (approximate, or measure precisely)
  const menuWidth = 200; // Approximate width of your action menu
  const menuHeight = 250; // Approximate height of your action menu (5 actions * ~40px per action + padding)

  // Adjust position to keep menu within chatContainer bounds
  // Check if menu overflows to the right
  if (left + menuWidth > containerRect.width) {
    left = containerRect.width - menuWidth - 10; // 10px padding from right
  }
  // Check if menu overflows to the left (e.g., if bubble is very far right)
  if (left < 0) {
    left = 10; // 10px padding from left
  }

  // Check if menu overflows downwards
  if (top + menuHeight > containerRect.height) {
    // If it overflows, try to position it above the bubble
    top = bubbleRect.bottom - containerRect.top - menuHeight;
    // Ensure it doesn't go above the top of the container
    if (top < 10) {
      top = 10; // 10px padding from top
    }
  }

  // If the bubble is near the top and menu overflows upwards
  if (top < 0) {
      top = 10; // Set to a minimum padding from the top
  }


  bubbleActionContainerStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };

  showBubbleActionContainer.value = true;
}

async function copyText(txt) {
   try {
      await navigator.clipboard.writeText(txt)
   
      $q.notify({message: "message text copied to clipboard"})
   } catch(e) {
      $q.notify({message: e.message})
   } finally {
      showBubbleActionContainer.value = false
   }
}


</script>

<style scoped lang="scss">
.chat-container {
  overflow-y: scroll;
  height: calc(100dvh - 130px);
  padding-bottom: 70px;
}

/* Base bubble styles */
.message-bubble {
  max-width: 70%; /* Adjust as needed */
  border-radius: 10px; /* Rounded corners */
  word-wrap: break-word; /* Ensure long words break */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  flex-shrink: 1; /* Allow bubble to shrink */
  display: flex; /* Enable flexbox for ordering */
  flex-direction: column; /* Stack items vertically */
  gap: 5px; /* Add some spacing between elements inside the bubble */
}

/* My Messages */
.message-mine-wrapper {
  justify-content: flex-end; /* Align to the right */
}

.message-mine {
  background-color: #e0f2f7; /* Light blue for my messages */
  color: #333;
  border-bottom-right-radius: 1px;
}

/* Other User Messages */
.message-other-wrapper {
  justify-content: flex-start; /* Align to the left */
}

.message-other {
  background-color: #ffffff; /* White for other user messages */
  color: #333;
}

/* System Messages */
.message-system {
  font-style: italic;
  margin-top: 10px;
  margin-bottom: 10px;
  padding: 5px 0;
}

/* Attachment Styles */
.attachment-top {
  margin-bottom: 0; /* Attachments should not have bottom margin when followed by text */
  /* Remove margin-top on the elements themselves if message-bubble has gap */
  & + .message-text-content {
    margin-top: 5px; /* Add margin to the text if it follows an attachment */
  }
}

.message-text-content {
  /* This is the div containing the actual text */
  flex-grow: 1; /* Allows text to take available space */
}

.message-timestamp {
  margin-top: 0px; /* Adjust as needed for spacing after text/attachments */
}

/* Message attachments (images) */
.message-image {
  max-width: 100%;
  min-width: 200px;
  height: auto;
  border-radius: 8px;
  /* margin-top: 5px; Removed due to flex gap */
}

.message-video {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  /* margin-top: 5px; Removed due to flex gap */
}

.attachment-queued-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--q-primary);
  z-index: 9999;
  position: absolute;
  top: 0;
  opacity: 0.8;
  right: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

/* Reply Bubble Styles */
.reply-bubble {
  background-color: rgba(0, 0, 0, 0.05); /* Slightly darker background for the reply block */
  border-left: 4px solid #1976d2; /* Blue border on the left */
  border-radius: 4px;
  padding: 5px 8px;
  margin-bottom: 5px;
  font-size: 0.85em;
  word-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis; /* For long text replies */
  white-space: nowrap; /* Keep the content on a single line */
}

.reply-bubble .text-bold {
  font-weight: 600;
}

/* Voice Note Player Styles */
.voice-note-player {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 150px; /* Adjust as needed */
  /* margin-bottom: 5px; Removed due to flex gap */
}

.voice-note-waveform {
  position: relative;
  flex-grow: 1;
  background-color: #e0e0e0; /* Static background for the waveform area */
  border-radius: 5px;
  overflow: hidden; /* Ensure progress bar stays within bounds */
  cursor: pointer; /* Indicate it's clickable */
}

.waveform-progress {
  height: 100%;
  background-color: #1976d2; /* Blue for progress */
  border-radius: 5px;
  transition: width 0.1s linear; /* Smooth progress animation */
}

.waveform-static {
  /* This would be for a static waveform representation when not playing */
  height: 100%;
  background-image:
    linear-gradient(to right, #bdbdbd 1px, transparent 1px),
    linear-gradient(to right, #bdbdbd 1px, transparent 1px);
  background-size:
    5px 100%,
    5px 100%;
  background-repeat: repeat-x;
  background-position: center;
  opacity: 0.7;
}

.voice-note-time {
  white-space: nowrap;
}

.file-type-attachment {
  display: flex;
  flex-direction: row;
  padding: 8px;
  min-width: 220px;
  border-radius: 10px;
  /* margin-bottom: 5px; Removed due to flex gap */

  .file-icon {
    padding: 0 10px 0 0;
  }
  .file-icon,
  .download-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
  }

  .download-icon {
    flex-grow: 1;
    margin-left: 20px;
    .icons {
      border-radius: 50px;
      padding: 4px;
    }

    span {
      border: 1px solid grey;
      border-radius: 50px;
    }
  }

  .file-meta {
    flex-grow: 2;
    .meta {
      font-size: 10px;
      color: grey;
    }
  }
  .file-name {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@keyframes shake-and-blink {
  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
  25% {
    transform: translateY(-5px);
    opacity: 0.8;
  }
  50% {
    transform: translateY(0);
    opacity: 1;
  }
  75% {
    transform: translateY(5px);
    opacity: 0.8;
  }
}

.go-down-btn {
  animation: shake-and-blink 2s infinite ease-in-out;
  /* Adjust animation duration, iteration count, and timing function as needed */
}

.chat-bubble-action-container {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;

  .blur-overlay {
    position: absolute; /* Use fixed to cover the entire viewport, not just the chat container */
    top: 0;
    left: 0;
    width: 100%; /* Cover full viewport width */
    height: 100%; /* Cover full viewport height */
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px); // For Safari support
    z-index: 1000; /* Ensure it's above other chat elements but below the actions */
  }

  .chat-bubble-actions {
    position: absolute; /* Positioned relative to the chat-bubble-action-container */
    border-radius: 20px;
    padding: 10px 0;
    background: white;
    box-shadow: 1px 2px 8px rgba(0, 0, 0, 0.2); /* Stronger shadow for better visibility */
    z-index: 1001; /* Ensure it's above the blur overlay */
    min-width: 150px; /* Give it a minimum width */

    div {
      padding: 8px 50px 8px 20px;
      color: black;
      cursor: pointer; 

      &:active {
        background: #e4e4e4;
      }
    }
  }
}

.chat-bubble-fade-enter-active,
.chat-bubble-fade-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.chat-bubble-fade-enter-from,
.chat-bubble-fade-leave-to {
  opacity: 0;
  transform: scale(0.9); /* Smaller scale for a popping effect */
}

.chat-bubble-fade-enter-to,
.chat-bubble-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

</style>
