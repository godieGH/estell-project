<template>
  <div style="overflow-y: scroll; height: 90vh">
    <div style="max-width: 700px; margin: 0 auto">
      <div style="overflow: visible">
        <div style="position: relative; overflow: visible">
          <textarea
            v-model="postContent"
            @input="onInput"
            placeholder="What's on your mind?"
            rows="5"
            style="
              border: none;
              outline: none;
              width: 100%;
              padding: 10px;
              background: transparent;
              resize: none;
            "
            :style="$q.dark.isActive ? 'color: grey;' : 'color: black;'"
            @keydown="onKeydown"
            ref="contentInput"
            :disabled="disableInput"
          ></textarea>

          <div
            v-show="suggestions.length"
            ref="tooltipRef"
            style="z-index: 999; position: absolute; padding: 1px"
            :style="`top:${top}px;left:${left}px;`"
          >
            <q-card :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
              <q-list>
                <q-item-section>
                  <q-item
                    :disable="disableInput"
                    ref="userRef"
                    clickable
                    style="display: flex; align-items: center; border-bottom: 1px solid #81818167"
                    class="text-grey cramp-text"
                    v-for="user in suggestions"
                    :key="user"
                    @click="addMention(user)"
                    ><i class="material-icons" style="padding-right: 10px; font-size: 18px"
                      >account_circle</i
                    >
                    {{ user.username }}</q-item
                  >
                </q-item-section>
              </q-list>
            </q-card>
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mt-sm wrap q-pl-sm">
          <q-chip
            :disable="disableInput"
            style="font-size: 11px; margin: 2px"
            class="text-grey"
            v-for="(t, i) in tags"
            :key="'t' + i"
            removable
            @remove="removeTag(i)"
            >#{{ t }}</q-chip
          >
          <q-chip
            :disable="disableInput"
            style="font-size: 11px; margin: 2px"
            v-for="(m, i) in mentions"
            :key="'m' + i"
            removable
            @remove="removeMention(i)"
            >@{{ m.username }}</q-chip
          >
          <q-chip
            :disable="disableInput"
            style="font-size: 11px; margin: 2px"
            v-for="(l, i) in links"
            :key="'l' + i"
            removable
            @remove="removeLink(i)"
            ><i class="material-icons" style="margin-right: 4px">public</i> {{ l.name }}</q-chip
          >
        </div>
      </div>

      <q-card-section class="row items-center justify-between">
        <div class="row items-center">
          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept="image/*,video/*"
            @change="onFileChange"
            :disabled="disableInput || post"
          />
          <q-btn
            :disabled="disableInput || post"
            flat
            round
            icon="insert_photo"
            class="q-ml-sm"
            @click="openFileSelector"
          />
          <q-btn :disabled="disableInput" flat round icon="tag" @click="attemptInsert('#')" />
          <q-btn
            :disabled="disableInput"
            flat
            round
            icon="alternate_email"
            class="q-ml-sm"
            @click="attemptInsert('@')"
          />
          <q-btn
            :disabled="disableInput"
            flat
            round
            icon="link"
            class="q-ml-sm"
            @click="attemptInsertLink()"
          />
          <q-btn
            :disabled="disableInput"
            flat
            round
            icon="emoji_emotions"
            class="q-ml-sm"
            @click="openEmojiPicker"
          />
        </div>
        <q-btn
          v-if="!post"
          flat
          round
          :loading="disableInput"
          icon="send"
          @click="submitPost"
          :disable="
            !postContent.trim() &&
            !attachedFile &&
            tags.length === 0 &&
            mentions.length === 0 &&
            links.length === 0
          "
        />
        <q-btn
          v-if="post"
          flat
          round
          :loading="disableInput"
          label="update"
          @click="submitEdit"
          :disable="disableInput || !isPostChanged || (post.type === 'text' && !postContent.trim())"
        />
      </q-card-section>

      <q-separator />
      <q-card-section v-if="attachedFile" class="overflow-auto">
        <div class="row q-col-gutter-sm">
          <component
            :is="isVideo(attachedFile) ? 'video' : 'img'"
            :src="attachedFile"
            controls
            style="width: 200px; height: 200px; border-radius: 8px; object-fit: cover"
          ></component>
          <q-btn
            :disabled="disableInput || post"
            round
            dense
            flat
            icon="cancel"
            size="sm"
            @click="removeFile"
          />
        </div>
      </q-card-section>

      <q-separator />
      <div>
        <q-list>
          <q-item style="border-bottom: 1px solid #ddd">
            <q-item-section>Category</q-item-section>
            <q-item-section side>
              <CategorySelector :disable="disableInput" v-model="selectedCategory" />
            </q-item-section>
          </q-item>
          <q-item style="border-bottom: 1px solid #ddd">
            <q-item-section>Audience</q-item-section>
            <q-item-section side>
              <AudienceSelector :disable="disableInput" v-model="audience" />
            </q-item-section>
          </q-item>
          <q-item v-if="!post" style="border-bottom: 1px solid #ddd">
            <q-item-section>Location</q-item-section>
            <q-item-section side>
              <q-toggle :disable="disableInput" v-model="enableLocation" dense />
            </q-item-section>
          </q-item>
          <q-item style="border-bottom: 1px solid #ddd">
            <q-item-section>Comments</q-item-section>
            <q-item-section side>
              <q-toggle :disable="disableInput" v-model="commentsToggle" dense />
            </q-item-section>
          </q-item>

          <q-item style="border-bottom: 1px solid #ddd">
            <q-item-section>Reaction Counts</q-item-section>
            <q-item-section side>
              <q-toggle :disable="disableInput" v-model="reactionCountsToggle" dense />
            </q-item-section>
          </q-item>

          <q-item v-if="!post" style="border-bottom: 1px solid #ddd">
            <q-item-section>Schedule Post</q-item-section>
            <q-item-section side>
              <q-toggle :disable="disableInput" v-model="scheduledPostToggle" dense />
            </q-item-section>
          </q-item>
          <q-item v-if="scheduledPostToggle" style="border-bottom: 1px solid #ddd">
            <q-item-section>
              <q-input
                filled
                v-model="scheduledDate"
                mask="####-##-## ##:##"
                :rules="['####-##-## ##:##']"
                dense
                readonly
              >
                <template v-if="!disableInput" v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="scheduledDate" mask="YYYY-MM-DD HH:mm">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                  <q-icon name="access_time" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-time v-model="scheduledDate" mask="YYYY-MM-DD HH:mm" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script setup>
import AudienceSelector from './misc/AudienceSelector.vue'
import CategorySelector from './misc/CategorySelector.vue'
import { api } from 'boot/axios'
import { useRouter } from 'vue-router'
import { onMounted, watch, ref, nextTick, computed } from 'vue'
import { useQuasar } from 'quasar'
import caret from 'textarea-caret'

const router = useRouter()
const $q = useQuasar()
const postContent = ref('')
const query = ref([])
const tags = ref([])
const mentions = ref([])
const links = ref([])
const attachedFile = ref(null)
const selectedFile = ref(null)
const initialPostState = ref(null)

const audience = ref('public')
const enableLocation = ref(false)
const commentsToggle = ref(true)
const reactionCountsToggle = ref(true)
const scheduledPostToggle = ref(false)
const scheduledDate = ref(null)
const selectedCategory = ref(null)
const postType = ref('text')

const disableInput = ref(false)

const userLocation = ref(null)
const locationError = ref(null)

const fetchUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        locationError.value = null // Clear any previous errors
      },
      (error) => {
        locationError.value = error.message
        userLocation.value = null // Clear location on error
        //console.error("Error getting location:", error);
        $q.notify({ color: 'red', message: locationError.value })
        enableLocation.value = false
      },
    )
  } else {
    locationError.value = 'Geolocation is not supported by this browser.'
    userLocation.value = null
    //console.error("Geolocation is not supported by this browser.");
    $q.notify({ color: 'red', message: locationError.value })
    enableLocation.value = false
  }
}
watch(enableLocation, (newValue) => {
  if (newValue) {
    fetchUserLocation()
  } else {
    userLocation.value = null
    locationError.value = null
  }
})

const contentInput = ref(null)
const fileInput = ref(null)
const tooltipRef = ref(null)
const userRef = ref(null)
const top = ref(0)
const left = ref(0)
const suggestions = ref([])

async function onInput(e) {
  tooltipRef.value.style.transform = `translateX(0px)`
  const area = contentInput.value
  const text = e.target.value
  if (!text) {
    suggestions.value = []
    return
  }
  const words = text.trim().split(/\s+/)
  const last = words[words.length - 1]
  const match = last.match(/^@(\w+)$/)
  if (!match) {
    suggestions.value = []
    return
  }
  const q = match ? match[1] : null
  if (!q) {
    suggestions.value = []
    return
  }

  try {
    const { data } = await api.post('/users/search', { q })
    if (!data.length) {
      suggestions.value = []
      return
    }
    suggestions.value = data
    const coords = caret(area, area.selectionEnd)
    let ccc
    if (coords.top <= 90) {
      ccc = coords.top
    } else {
      ccc = 100
    }
    top.value = ccc + 21
    left.value = coords.left
    if (area.getBoundingClientRect().width - left.value <= 160) {
      tooltipRef.value.style.transform = `translateX(-170px)`
    } else {
      tooltipRef.value.style.transform = `translateX(0px)`
    }
  } catch (err) {
    console.error(err.message)
    suggestions.value = []
  }
}

watch(postContent, (val) => {
  if (val.length > 800) {
    postContent.value = val.slice(0, 800)
    $q.notify({ color: 'warning', message: 'Max 2,200 characters' })
  }

  const cleaned = val.replace(/[^A-Za-z0-9_'.]+/g, ' ')
  query.value = cleaned
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9][A-Za-z0-9_'.]*[A-Za-z0-9]?$/.test(w))
})

function selectTextarea() {
  return contentInput.value
}

function canAddTag() {
  if (tags.value.length >= 5) {
    $q.notify({ message: 'Tag limit reached (max 5)', color: 'warning' })
    return false
  }
  return true
}

function canAddMention() {
  if (mentions.value.length >= 5) {
    $q.notify({ message: 'Mention limit reached (max 5)', color: 'warning' })
    return false
  }
  return true
}

function canAddLink() {
  if (links.value.length >= 3) {
    $q.notify({ message: 'Link limit reached (max 3)', color: 'warning' })
    return false
  }
  return true
}

function attemptInsert(symbol) {
  const area = selectTextarea()
  if (!area) return
  const pos = area.selectionStart
  const text = postContent.value
  if (symbol === '@' && mentions.value.length >= 5)
    return $q.notify({ message: 'Mention limit reached (max 5)', color: 'warning' })
  if (symbol === '#' && tags.value.length >= 5)
    return $q.notify({ message: 'Tag limit reached (max 5)', color: 'warning' })
  postContent.value = text.slice(0, pos) + symbol + text.slice(pos)
  nextTick(() => {
    area.setSelectionRange(pos + 1, pos + 1)
    area.focus()
  })
}

function attemptInsertLink() {
  if (!canAddLink()) return
  $q.dialog({
    title: 'Link text',
    prompt: {
      model: '',
      type: 'text',
      label: 'e.g. Google',
    },
    ok: true,
    okLabel: 'Ok',
    cancel: 'Markdown',
  })
    .onOk((linkText) => {
      const name = linkText.trim()
      if (!name) return

      // 2) Ask for URL
      $q.dialog({
        title: 'Link URL',
        prompt: {
          model: 'https://',
          type: 'url',
          label: 'Must start with https:// Or http://',
        },
        cancel: true,
      })
        .onOk((inputUrl) => {
          const url = inputUrl.trim()
          try {
            new URL(url)
          } catch {
            $q.notify({ message: 'Invalid URL', color: 'negative' })
            return
          }

          // 3) Insert markdown, track link
          const area = contentInput.value
          const pos = area.selectionStart
          //const text = postContent.value;
          const md = `[${name}](${url})`
          //postContent.value = text.slice(0, pos) + md + text.slice(pos);
          links.value.push({ name, url })

          nextTick(() => {
            area.setSelectionRange(pos + md.length, pos + md.length)
            area.focus()
          })
        })
        .onCancel(() => {
          /* user bailed on URL dialog */
        })
    })
    .onCancel(() => {
      // Markdown button: insert skeleton [name](url)
      const area = contentInput.value
      const pos = area.selectionStart
      const text = postContent.value
      const skeleton = '[name](https://)'
      postContent.value = text.slice(0, pos) + skeleton + text.slice(pos)

      nextTick(() => {
        const start = pos + 1
        const end = pos + 5
        area.setSelectionRange(start, end) // select 'name' for quick overwrite
        area.focus()
      })
    })
}

function onKeydown(e) {
  //console.log(e.target.value)
  if (e.key === 'Enter') {
    e.preventDefault()
    const val = postContent.value
    const area = selectTextarea()
    if (!area) return
    const pos = area.selectionStart
    const words = val.slice(0, pos).split(/\s+/)
    const current = words.pop()

    // inside onKeydown:
    if (/^#\w+$/.test(current) && canAddTag()) {
      tags.value.push(current.slice(1))
      return updateContent(val, current, area)
    }

    if (/^@\w+$/.test(current) && canAddMention()) {
      if (suggestions.value.length > 0) {
        //const username = suggestions.value[0].username
        mentions.value.push(suggestions.value[0])
        updateContent(val, current, area)
        setTimeout(function () {
          suggestions.value = []
        }, 100)
      }
      console.log(suggestions.value)
      console.log(mentions.value)
      return
    }

    // limit links
    if (/\[[^\]]+\]\([^)]+\)/.test(current)) {
      if (!canAddLink()) {
        return (postContent.value = val + (e.key === 'Enter' ? '\n' : ' '))
      }
      // your existing link-parsing & push logic here...
      const name = current.slice(current.indexOf('[') + 1, current.indexOf(']'))
      const url = current.slice(current.indexOf('(') + 1, current.indexOf(')'))
      try {
        new URL(url)
        links.value.push({ name, url })
        return updateContent(val, current, area)
      } catch {
        return $q.notify({ message: 'Invalid URL', color: 'negative' })
      }
    }

    postContent.value = val + (e.key === 'Enter' ? '\n' : ' ')
  }
}

function addMention(u) {
  const t = canAddMention()
  if (!t) return
  const val = postContent.value
  const area = selectTextarea()
  if (!area) return
  const pos = area.selectionStart
  const words = val.slice(0, pos).split(/\s+/)
  const current = words.pop()
  mentions.value.push(u)
  updateContent(val, current, area)

  setTimeout(function () {
    suggestions.value = []
  }, 100)
}

function updateContent(val, token, area) {
  const trimmed =
    val.slice(0, val.lastIndexOf(token)) + val.slice(val.lastIndexOf(token) + token.length) + ' '
  postContent.value = trimmed.trim() + ' '
  nextTick(() => {
    const p = trimmed.length
    area.setSelectionRange(p, p)
    area.focus()
  })
}

function removeTag(i) {
  tags.value.splice(i, 1)
}
function removeMention(i) {
  mentions.value.splice(i, 1)
}
function removeLink(i) {
  links.value.splice(i, 1)
}

function openEmojiPicker() {
  $q.notify({ message: 'Emoji picker placeholder', color: 'info' })
}

function openFileSelector() {
  nextTick(() => fileInput.value.click())
}

function onFileChange(e) {
  const f = e.target.files[0]
  if (!f) return
  if (!/^image\//.test(f.type) && !/^video\//.test(f.type))
    return $q.notify({ message: 'Only images/videos allowed', color: 'negative' })

  // size check (you have that)
  if (f.size > 150 * 1024 * 1024)
    return $q.notify({ message: 'File too large (max 150 MB)', color: 'negative' })

  // video duration check
  if (/^video\//.test(f.type)) {
    const url = URL.createObjectURL(f)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.src = url
    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (vid.duration > 180) {
        $q.notify({ message: 'Video must be less than 3 minutes', color: 'warning' })
        fileInput.value.value = '' // reset the input
        return
      }
      // duration ok → proceed to read
      attachFileAndType(f)
    }
    return
  }

  // Image aspect ratio check
  if (/^image\//.test(f.type)) {
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const width = img.width
      const height = img.height
      const aspectRatio = width / height

      // Calculate the aspect ratios for 16:9 and 9:16
      const minAllowedAspectRatio = 0.4 // Equivalent to 0.5625
      const maxAllowedAspectRatio = 3 // Equivalent to 1.777...

      // Check if the image is within the desired aspect ratio range
      if (aspectRatio < minAllowedAspectRatio || aspectRatio > maxAllowedAspectRatio) {
        $q.notify({ message: 'Image must be between 16:9 and 9:16', color: 'warning' })
        // Reset the input
        if (fileInput.value && fileInput.value !== undefined) {
          fileInput.value.value = ''
        } else if (e.target) {
          e.target.value = ''
        }
        return
      }
      // If dimensions are within the aspect ratio, proceed to attach
      attachFileAndType(f)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      $q.notify({ message: 'Could not load image to check dimensions', color: 'negative' })
      // Reset the input if there's an error loading the image
      if (fileInput.value && fileInput.value !== undefined) {
        fileInput.value.value = ''
      } else if (e.target) {
        e.target.value = ''
      }
    }
    img.src = url
    return // Important: Return here to wait for img.onload
  }

  // image path
  attachFileAndType(f)
}

function attachFileAndType(f) {
  selectedFile.value = f
  postType.value = f.type.startsWith('image/') ? 'image' : 'video'
  const reader = new FileReader()
  reader.onload = (ev) => (attachedFile.value = ev.target.result)
  reader.readAsDataURL(f)
}

function removeFile() {
  attachedFile.value = null
  postType.value = 'text'
}
function isVideo(src) {
  const commonVideoExtensions = [
    '.mp4',
    '.mov',
    '.avi',
    '.wmv',
    '.flv',
    '.webm',
    '.mkv',
    '.mpg',
    '.mpeg',
    '.3gp',
    '.3g2',
    '.ogv',
    '.m4v',
    '.mts',
    '.m2ts',
    '.ts',
    '.vob',
    '.qt',
    '.rm',
    '.asf',
    '.amv',
    '.f4v',
    '.f4p',
    '.f4a',
    '.f4b',
    '.mod',
    '.yuv',
    '.svi',
    '.roq',
    '.nsv',
    '.mxf',
    '.drc', // Less common, but good to include if you might encounter them
    // Add any other specific extensions you might need
  ]

  // Check for data URI
  if (src.startsWith('data:video')) {
    return true
  }

  // Check for common file extensions (case-insensitive)
  const lowerSrc = src.toLowerCase()
  for (const ext of commonVideoExtensions) {
    if (lowerSrc.endsWith(ext)) {
      return true
    }
  }

  return false
}

import { socket } from 'boot/socket'

async function submitPost() {
  if (
    !postContent.value.trim() &&
    !attachedFile.value &&
    tags.value.length === 0 &&
    mentions.value.length === 0 &&
    links.value.length === 0
  ) {
    return $q.notify({ message: 'Nothing to post', color: 'negative' })
  }

  disableInput.value = true

  const notif = $q.notify({
    message: 'Uploading file...',
    caption: '0%',
    spinner: true,
    timeout: 0,
    group: false,
  })

  let mediaUrl = null
  let originalMedia = null
  let thumbnailUrl = null

  const processingStartListener = (data) => {
    notif({ message: data.message, caption: '0%' })
  }

  const hlsProgressListener = (data) => {
    notif({ caption: `${data.percent}%` })
  }

  const mp4ProgressListener = (data) => {
    notif({ caption: `${data.percent}%` })
  }

  socket.on('processing_start', processingStartListener)
  socket.on('hls_progress', hlsProgressListener)
  socket.on('mp4_progress', mp4ProgressListener)

  const cleanupListeners = () => {
    socket.off('processing_start', processingStartListener)
    socket.off('hls_progress', hlsProgressListener)
    socket.off('mp4_progress', mp4ProgressListener)
  }

  if (postType.value !== 'text') {
    const formData = new FormData()
    formData.append('media', selectedFile.value)
    try {
      const response = await api.post('/posts/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Socket-ID': socket.id,
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          if (percent < 100) {
            notif({ caption: `${percent}%` })
          } else {
            notif({ message: 'Upload complete. Processing...', caption: 'Please wait...' })
          }
        },
      })
      ;({ mediaUrl, originalMedia, thumbnailUrl } = response.data)
    } catch (err) {
      notif({
        type: 'negative',
        spinner: false,
        icon: 'error',
        message: 'Failed to upload file!',
        caption: err.response?.data?.details || err.message,
        timeout: 4000,
      })
      disableInput.value = false
      cleanupListeners()
      return
    }
  }

  cleanupListeners()

  notif({ message: 'Creating post...' })

  const postObj = {
    type: postType.value,
    body: postContent.value,
    mediaUrl,
    thumbnailUrl,
    originalMedia,
    link_url: links.value,
    status: 'published',
    audience: audience.value,
    category: selectedCategory.value,
    location: userLocation.value,
    comments: commentsToggle.value,
    like_counts: reactionCountsToggle.value,
    keywords: {
      query: query.value,
      tags: tags.value,
      mentions: mentions.value,
    },
    ScheduledAt: scheduledPostToggle.value
      ? scheduledDate.value
        ? new Date(scheduledDate.value).toISOString()
        : new Date().toISOString()
      : new Date().toISOString(),
  }

  try {
    await api.post('/posts/create', postObj)
    notif({
      spinner: false,
      icon: 'done',
      message: 'Post created Successfully!',
      caption: '',
      timeout: 3000,
    })
    postContent.value = ''
    tags.value = []
    mentions.value = []
    links.value = []
    attachedFile.value = null
    selectedCategory.value = ''
    router.push({ path: '/profile' })
  } catch (err) {
    notif({
      type: 'negative',
      spinner: false,
      icon: 'error',
      message: `Failed To create a post!`,
      caption: err.response?.data?.message || err.message,
      timeout: 4000,
    })
  } finally {
    disableInput.value = false
  }
}

import { getPostSrc } from 'src/composables/formater'

const props = defineProps({
  post: Object,
})
onMounted(() => {
  if (props.post) {
    postContent.value = props.post.body
    tags.value = props.post.keywords.tags
    mentions.value = props.post.keywords.mentions
    links.value = props.post.linkUrl
    audience.value = props.post.audience
    commentsToggle.value = props.post.allow_comments
    selectedCategory.value = props.post.category
    reactionCountsToggle.value = props.post.likeCounts

    if (props.post.type === 'image' && props.post.mediaUrl) {
      attachedFile.value = getPostSrc(props.post.mediaUrl)
    }

    if (props.post.type === 'video' && props.post.mediaUrl) {
      attachedFile.value = props.post.originalMedia
    }

    initialPostState.value = {
      body: props.post.body,
      tags: JSON.parse(JSON.stringify(props.post.keywords.tags)),
      mentions: JSON.parse(JSON.stringify(props.post.keywords.mentions)),
      links: JSON.parse(JSON.stringify(props.post.linkUrl)),
      audience: props.post.audience,
      category: props.post.category,
      allow_comments: props.post.allow_comments,
      like_counts: props.post.likeCounts,
    }
  }
})

async function submitEdit() {
  disableInput.value = true
  const notif = $q.notify({
    message: 'Updating post...',
    spinner: true,
    timeout: 0,
    group: false,
  })

  try {
    const updatePayload = {
      body: postContent.value,
      linkUrl: links.value,
      audience: audience.value,
      category: selectedCategory.value,
      comments: commentsToggle.value,
      likeCounts: reactionCountsToggle.value,
      keywords: {
        query: query.value,
        tags: tags.value,
        mentions: mentions.value,
      },
    }

    await api.put(`/posts/update/${props.post.id}`, updatePayload)
    notif({
      spinner: false,
      icon: 'done',
      message: 'Post updated Successfully!',
      timeout: 3000,
    })
    isPostChanged.value = false
    window.location.reload()
  } catch (err) {
    notif({
      type: 'negative',
      spinner: false,
      icon: 'error',
      message: 'Failed to update post!',
      caption: err.response?.data?.message || err.message,
      timeout: 4000,
    })
  } finally {
    disableInput.value = false
  }
}

const isPostChanged = computed(() => {
  if (!props.post || !initialPostState.value) {
    return false
  }

  if (postContent.value !== initialPostState.value.body) return true
  if (audience.value !== initialPostState.value.audience) return true
  if (selectedCategory.value !== initialPostState.value.category) return true
  if (commentsToggle.value !== initialPostState.value.allow_comments) return true
  if (reactionCountsToggle.value !== initialPostState.value.like_counts) return true

  if (JSON.stringify(tags.value) !== JSON.stringify(initialPostState.value.tags)) return true
  if (JSON.stringify(mentions.value) !== JSON.stringify(initialPostState.value.mentions))
    return true
  if (JSON.stringify(links.value) !== JSON.stringify(initialPostState.value.links)) return true

  return false
})
</script>

<style scoped lang="scss">
.hidden {
  display: none;
}
.wrap {
  flex-wrap: wrap;
}
.content-input :v-deep textarea {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  resize: none;
}

.no-border-select {
  background: transparent;
  &:hover,
  &:focus,
  &:active {
    border: none;
    outline: none;
    background: transparent;
  }
}

.cramp-text {
  white-space: nowrap; /* Prevents the text from wrapping to the next line */
  overflow: hidden; /* Hides any content that overflows the element's box */
  text-overflow: ellipsis; /* Displays an ellipsis (...) to indicate truncated text */
}
</style>
