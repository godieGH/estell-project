<template>
  <div
    :style="{ background: isRecording ? 'transparent' : '' }"
    class="chat-input-area"
    ref="chatInputAreaRef"
  >
    <transition name="mic-fade" appear>
      <button
        @touchstart="startRecording"
        @touchend="stopRecording"
        @touchmove="handleTouchMove"
        class="icon-button microphone"
        :class="{ 'mic-btn-on-rec': isRecording }"
        :style="micBtnStyle"
        v-show="!(hasTyped || hasAttachment)"
      >
        <i
          style="font-size: 25px"
          :class="readyToSendMsg ? 'text-red' : 'text-grey'"
          class="material-icons"
          >{{ readyToSendMsg ? 'mic' : 'mic_off' }}</i
        >
      </button>
    </transition>

    <div v-if="!isRecording" style="display: flex; flex-grow: 1; gap: 5px; align-items: center">
      <div class="text-input-wrapper">
        <button class="icon-button emoji-button">
          <i class="material-icons">emoji_emotions</i>
        </button>

        <div class="textarea-and-attachment-container">
          <textarea
            class="chat-textarea"
            placeholder="Type your message..."
            rows="1"
            @input="autoGrowTextarea"
            v-model="message"
            ref="textareaRef"
          ></textarea>

          <div v-if="hasAttachment" class="attachment-preview-wrapper">
            <div style="width: 100%" class="attachment-preview">
              <img
                v-if="attachment.type === 'image'"
                :src="attachment.url"
                alt="Selected Image"
                class="attachment-thumbnail"
              />
              <img
                v-else-if="attachment.type === 'video'"
                src="~assets/video-logo.png"
                alt="Video Attachment"
                class="attachment-icon"
              />
              <q-icon
                v-else-if="attachment.type === 'file'"
                name="insert_drive_file"
                size="30px"
                class="attachment-icon"
              />
              <span class="attachment-name">{{ attachment.name }}</span>
              <button class="icon-button close-attachment" @click="discardAttachment">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </div>

        <button
          class="icon-button attachment"
          :class="{ active: isFabMenuOpen }"
          @click.stop="
            () => {
              if (readyToSendMsg) {
                toggleFabMenu()
              }
            }
          "
          ref="attachmentButtonRef"
          v-if="!hasAttachment"
        >
          <i :class="readyToSendMsg ? '' : 'text-grey'" class="material-icons">attachment</i>
        </button>
      </div>
      <button :class="{ 'text-green': hasTyped || hasAttachment }" class="send-button">
        <i :class="readyToSendMsg ? '' : 'text-grey'" class="material-icons" @click="sendMsg"
          >send</i
        >
      </button>
    </div>

    <div v-else style="padding: 10px; flex-grow: 1; display: flex; align-items: center">
      <div style="flex-grow: 1">
        Swipe to Cancel <i class="q-ml-sm material-icons">chevron_right</i>
      </div>
      <div class="text-grey recoding-clock">{{ formattedRecordingTime }}</div>
    </div>
  </div>

  <teleport to="body">
    <div class="fab-menu" :class="{ active: isFabMenuOpen }" :style="fabMenuStyle" ref="fabMenuRef">
      <div style="display: flex; align-items: center">
        <button class="icon-button fab-item" @click="handleFabAction('link')">
          <i class="material-icons">link</i>
        </button>
      </div>
      <div style="display: flex; align-items: center">
        <button class="icon-button fab-item" @click="handleFabAction('location')">
          <i class="material-icons">location_on</i>
        </button>
      </div>
      <div style="display: flex; align-items: center">
        <button class="icon-button fab-item" @click="handleFabAction('file')">
          <i class="material-icons">insert_drive_file</i>
        </button>
      </div>
      <div style="display: flex; align-items: center">
        <button class="icon-button fab-item" @click="handleFabAction('video')">
          <i class="material-icons">videocam</i>
        </button>
      </div>
      <div style="display: flex; align-items: center">
        <button class="icon-button fab-item" @click="handleFabAction('image')">
          <i class="material-icons">image</i>
        </button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useUserStore } from 'stores/user'
import { useMessageStore } from 'stores/messageStore'

const userStore = useUserStore()
const messageStore = useMessageStore()
const props = defineProps({
  currentConversation: Object,
})
const readyToSendMsg = ref(false)

onMounted((a = props.currentConversation) => {
  readyToSendMsg.value = false
  if (a.id) {
    readyToSendMsg.value = true
  }
})

const message = ref('')
const isFabMenuOpen = ref(false)
const fabMenuStyle = reactive({})
const attachment = ref({
  type: null,
  url: null,
  name: null,
  file: null,
})
const $q = useQuasar()

const hasAttachment = computed(() => attachment.value.type !== null)
const hasTyped = ref(false)

const textareaRef = ref(null)
const attachmentButtonRef = ref(null)
const fabMenuRef = ref(null)
const chatInputAreaRef = ref(null)

const autoGrowTextarea = () => {
  const textarea = textareaRef.value
  hasTyped.value = textarea.value.length > 0
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }
}

const toggleFabMenu = () => {
  isFabMenuOpen.value = !isFabMenuOpen.value
  nextTick(() => {
    if (isFabMenuOpen.value) {
      positionFabMenu()
    }
  })
}

const positionFabMenu = () => {
  if (!attachmentButtonRef.value || !fabMenuRef.value) {
    return
  }

  const buttonRect = attachmentButtonRef.value.getBoundingClientRect()

  fabMenuStyle.right = `${window.innerWidth - buttonRect.right}px`
  fabMenuStyle.bottom = `${window.innerHeight - buttonRect.top + 10}px`
  fabMenuStyle.position = 'fixed'
}

const closeFabMenuOnClickOutside = (event) => {
  if (
    isFabMenuOpen.value &&
    fabMenuRef.value &&
    !fabMenuRef.value.contains(event.target) &&
    attachmentButtonRef.value &&
    !attachmentButtonRef.value.contains(event.target)
  ) {
    isFabMenuOpen.value = false
  }
}

const openDevicePicker = (acceptType, attachmentType) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = acceptType
  input.style.display = 'none'

  input.onchange = (event) => {
    const files = event.target.files
    if (files.length > 0) {
      const selectedFile = files[0]

      let isValid = true
      let errorMessage = ''

      // File size validation
      const fileSizeMB = selectedFile.size / (1024 * 1024) // Convert bytes to MB

      switch (attachmentType) {
        case 'image':
          if (fileSizeMB > 5) {
            isValid = false
            errorMessage = 'Image must be less than 5MBs.'
          }
          break
        case 'video':
          if (fileSizeMB > 20) {
            isValid = false
            errorMessage = 'Video must be less than 20MBs.'
          }
          break
        case 'file': // For general files
          if (fileSizeMB > 50) {
            isValid = false
            errorMessage = 'File must be less than 50MBs.'
          }
          break
      }

      if (!isValid) {
        $q.notify({
          message: errorMessage,
        })
        document.body.removeChild(input)
        isFabMenuOpen.value = false
        return
      }

      attachment.value.type = attachmentType
      attachment.value.name = selectedFile.name
      attachment.value.file = selectedFile

      if (attachmentType === 'image') {
        attachment.value.url = URL.createObjectURL(selectedFile)
      } else if (attachmentType === 'video') {
        attachment.value.url = '~assets/video-logo.png' // Placeholder for video
      } else if (attachmentType === 'file') {
        attachment.value.url = '~assets/file-logo.png' // Placeholder for general file
      }
    }
    document.body.removeChild(input)
    isFabMenuOpen.value = false
  }

  document.body.appendChild(input)
  input.click()

  //console.log(attachment.value)
}

const handleFabAction = (action) => {
  switch (action) {
    case 'location':
      isFabMenuOpen.value = false
      break
    case 'file':
      openDevicePicker('*/*', 'file')
      break
    case 'video':
      openDevicePicker('video/*', 'video')
      break
    case 'image':
      openDevicePicker('image/*', 'image')
      break
    default:
      console.warn('Unknown FAB action:', action)
  }
}

const discardAttachment = () => {
  if (attachment.value.type === 'image' && attachment.value.url) {
    URL.revokeObjectURL(attachment.value.url)
  }
  attachment.value.type = null
  attachment.value.url = null
  attachment.value.name = null
  attachment.value.file = null
}

onMounted(() => {
  positionFabMenu()
  window.addEventListener('resize', positionFabMenu)
  document.addEventListener('click', closeFabMenuOnClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', positionFabMenu)
  document.removeEventListener('click', closeFabMenuOnClickOutside)
  if (attachment.value.type === 'image' && attachment.value.url) {
    URL.revokeObjectURL(attachment.value.url)
  }
})

const recTimeIntervalId = ref(null)
const waitABitId = ref(null)
const isRecording = ref(false)
const startX = ref(0)
const currentTranslateX = ref(0)
const recordingDuration = ref(0)

let mediaStream
let mediaRecorder
const audioChunks = ref([])
const fullAudioBlob = ref(null)

const micBtnStyle = computed(() => {
  return {
    transform: isRecording.value
      ? `scale(1) translateY(30px) translateX(-30px) translateX(${currentTranslateX.value}px)`
      : '',
  }
})

const formattedRecordingTime = computed(() => {
  const minutes = Math.floor(recordingDuration.value / 60)
  const seconds = recordingDuration.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const getSupportedAudioMimeType = () => {
  const types = [
    'audio/wav',
    'audio/webm; codecs=opus',
    'audio/webm',
    'audio/ogg; codecs=opus',
    'audio/ogg',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return 'audio/webm'
}

const startRecording = (e) => {
  if (!readyToSendMsg.value) return
  if (e.touches && e.touches.length > 0) {
    startX.value = e.touches[0].clientX
  }

  waitABitId.value = setTimeout(() => {
    if (e.touches && e.touches.length > 0 && e.touches[0].clientX === startX.value) {
      isRecording.value = true
      recordingDuration.value = 0
      currentTranslateX.value = 0
      recTimeIntervalId.value = setInterval(() => {
        recordingDuration.value++
      }, 1000)
      mediaRecorder = null
      fullAudioBlob.value = null
      startRecordingAudio()
    }
  }, 150)
}

const startRecordingAudio = () => {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(function (stream) {
      mediaStream = stream
      const mimeType = getSupportedAudioMimeType()
      let options = { mimeType: mimeType }

      if (mimeType.includes('opus')) {
        options.audioBitsPerSecond = 128000
      }

      mediaRecorder = new MediaRecorder(mediaStream, options)

      mediaRecorder.ondataavailable = function (event) {
        audioChunks.value.push(event.data)
      }
      mediaRecorder.start(1000)
    })
    .catch(function (err) {
      cancelRecording()
      console.log(err.message)
      $q.notify({
        message: `Voice Recording: ${err.message}`,
      })
    })
}

const handleTouchMove = (e) => {
  if (!isRecording.value || !e.touches || e.touches.length === 0) {
    return
  }

  const currentX = e.touches[0].clientX
  const deltaX = currentX - startX.value

  if (deltaX > 0) {
    currentTranslateX.value = deltaX
  }

  if (currentTranslateX.value >= 200) {
    cancelRecording()
  }
}

const cancelRecording = () => {
  clearInterval(waitABitId.value)
  waitABitId.value = null
  clearInterval(recTimeIntervalId.value)
  recTimeIntervalId.value = null
  isRecording.value = false
  recordingDuration.value = 0
  currentTranslateX.value = 0

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }

  mediaRecorder = null
  fullAudioBlob.value = null
}

const stopRecording = () => {
  clearInterval(waitABitId.value)
  clearInterval(recTimeIntervalId.value)
  recTimeIntervalId.value = null

  if (isRecording.value) {
    if (recordingDuration.value < 1) {
      $q.notify({
        message: 'The Voice note too short',
        position: 'bottom-right',
      })
      cancelRecording()
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        mediaStream = null
      }
      return
    }
    if (currentTranslateX.value < 200) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }

      mediaRecorder.onstop = function () {
        const mimeType = getSupportedAudioMimeType()
        fullAudioBlob.value = new Blob(audioChunks.value, { type: mimeType })

        audioChunks.value = []

        sendMsg()
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop())
          mediaStream = null
        }

        const audio = new Audio()
        audio.src = URL.createObjectURL(fullAudioBlob.value)
        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration
          console.log('Audio duration:', duration)
          URL.revokeObjectURL(audio.src)
        })
      }
    } else {
      console.log('Recording cancelled by drag!')
    }
  }

  isRecording.value = false
  recordingDuration.value = 0
  currentTranslateX.value = 0
}

onUnmounted(() => {
  if (recTimeIntervalId.value) {
    clearInterval(recTimeIntervalId.value)
  }
  if (waitABitId.value) {
    clearInterval(waitABitId.value)
  }
  if (fullAudioBlob.value && fullAudioBlob.value.url) {
    URL.revokeObjectURL(fullAudioBlob.value.url)
  }
})

async function sendMsg() {
  if (!hasTyped.value && !hasAttachment.value && !fullAudioBlob.value) return

  const content = {
    text: message.value != '' ? message.value : null,
    attachment: hasAttachment.value ? { ...attachment.value } : null,
    fullAudioBlob: fullAudioBlob.value,
  }

  const messageObj = {
    conversation: props.currentConversation,
    sender: userStore.user,
    sender_type: 'user',
    content,
    sent_at: Date.now(),
    isMine: true,
    read_by: [],
    queued: true,
  }

  if (messageStore.queueMsg(messageObj)) {
    message.value = ''
    hasTyped.value = false
    discardAttachment()
    fullAudioBlob.value = null
  }
  await messageStore.processAllQueuedMessages()
}
</script>

<style scoped lang="scss">
/* Existing styles */
.chat-input-area {
  display: flex;
  align-items: flex-end;
  padding: 5px;
  background-color: #f5f5f5;
  gap: 5px;
  position: relative;
  overflow: hidden;
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

/* Microphone button transitions */
.microphone {
  flex-shrink: 0; /* Prevent shrinking when active */
  flex-basis: 40px; /* Approximate width of the button */
  overflow: hidden; /* Hide overflow during transition */
  transition:
    flex-basis 0.3s ease,
    opacity 0.3s ease; /* Transition flex-basis and opacity */
}

/* Vue transition classes for microphone button */
.mic-fade-enter-active,
.mic-fade-leave-active {
  transition:
    flex-basis 0.3s ease,
    opacity 0.3s ease;
}

.mic-fade-enter-from,
.mic-fade-leave-to {
  flex-basis: 0;
  opacity: 0;
}

.text-input-wrapper {
  flex-grow: 1; /* Allows it to grow to fill space */
  position: relative;
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 20px;
  border: 1px solid #ddd;
  overflow: hidden;
  min-height: 40px;
  padding: 5px;
  /* Remove width transition from here. Flexbox will handle it with flex-grow */
  transition: flex-grow 0.3s ease; /* Add transition for flex-grow */
}

/* Specific style for the emoji button inside text-input-wrapper */
.text-input-wrapper .emoji-button {
  flex-shrink: 0;
  padding: 5px;
}

.textarea-and-attachment-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.chat-textarea {
  flex-grow: 1;
  border: none;
  margin: 0;
  outline: none;
  padding: 0 0 0 0;
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  min-height: 20px;
  max-height: 120px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* Scrollbar styles for webkit browsers */
.chat-textarea::-webkit-scrollbar {
  width: 6px;
}

.chat-textarea::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.chat-textarea::-webkit-scrollbar-track {
  background-color: #f9f9f9;
}

.text-input-wrapper .attachment {
  position: relative;
  flex-shrink: 0;
  margin-left: 5px;
  padding: 5px;
  transform: rotate(90deg);
  transition: transform 0.3s ease;
}

.text-input-wrapper .attachment.active {
  transform: rotate(45deg);
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
}

.send-button:active {
  transform: scale(0.9);
}

.send-button .material-icons {
  font-size: 24px;
}

/* --- FAB Menu Styles --- */
.fab-menu {
  position: fixed;
  color: white; /* Corrected typo: whte -> white */
  -webkit-text-stroke: var(--q-secondary) 1px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px);
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease,
    transform 0.3s ease;
  pointer-events: none;
  z-index: 9999;
  padding-bottom: 10px;
}

.fab-menu.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.fab-item {
  background-color: var(--q-secondary);
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  font-size: 20px;
}

.fab-item:active {
  transform: scale(0.9);
  background-color: var(--q-primary);
}

/* Staggered animation for individual FAB items */
.fab-menu .fab-item {
  transform: translateY(10px);
  opacity: 0;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.fab-menu.active .fab-item {
  transform: translateY(0);
  opacity: 1;
}

/* Apply a delay to each item for a staggered effect */
.fab-menu.active .fab-item:nth-child(1) {
  transition-delay: 0.25s;
}
.fab-menu.active .fab-item:nth-child(2) {
  transition-delay: 0.2s;
}
.fab-menu.active .fab-item:nth-child(3) {
  transition-delay: 0.15s;
}
.fab-menu.active .fab-item:nth-child(4) {
  transition-delay: 0.1s;
}

/* --- Styles for Attachment Preview within the input area --- */
.attachment-preview-wrapper {
  display: flex;
  align-items: center;
  padding-top: 5px;
  width: 100%;
  box-sizing: border-box;
}

.attachment-preview {
  display: flex;
  align-items: center;
  background-color: #e0e0e0;
  border-radius: 15px;
  padding: 5px 10px;
  gap: 8px;
  max-width: 100%;
  overflow: hidden;
}

.attachment-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.attachment-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: contain;
  flex-shrink: 0;
}

.attachment-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  color: #333;
  flex-grow: 1;
}

.close-attachment {
  padding: 4px;
  color: #777;
  flex-shrink: 0;
}

.close-attachment .material-icons {
  font-size: 20px;
}

.mic-btn-on-rec {
  background: teal;
  height: 100px;
  flex-basis: 100px;
  transform: scale(1) translateY(30px) translateX(-30px);
  i {
    font-size: 40px;
  }
  &:active {
    transform: scale(1) translateY(30px) translateX(-30px);
    background: teal;
  }
}
</style>
