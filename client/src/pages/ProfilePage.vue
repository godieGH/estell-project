<template>
  <q-page class="profile-page">
    <div @scroll="handleScroll" class="q-pa-md" style="overflow: scroll; height: 95vh">
      <div v-if="loading" class="profile-skeleton">
        <q-skeleton type="circle" class="avatar-skel" />
        <q-skeleton type="text" width="50%" />
        <q-skeleton type="text" width="70%" />
        <q-skeleton type="text" width="20%" height="50px" />
      </div>
      <div v-else class="profile-hero">
        <div
          class="row q-col-gutter-md"
          :class="$q.screen.lt.md ? 'column items-center text-center' : 'items-center text-left'"
        >
          <div class="q-col-12 q-col-md-4 avatar-column flex flex-center">
            <div class="avatar-wrapper">
              <q-avatar size="120px" :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-3'">
                <img :src="user.avatar" />
              </q-avatar>
              <q-icon
                name="add"
                v-show="tab === 'settings'"
                class="edit-icon"
                :class="$q.dark.isActive ? 'bg-dark text-white' : 'bg-white text-primary'"
                @click="focusAvatar"
              />
              <input
                type="file"
                ref="avatarInput"
                accept="image/*"
                @change="onAvatarSelected"
                style="display: none"
              />
            </div>
          </div>

          <div class="q-col-12 q-col-md-8 info-column">
            <div class="name text-h6 q-mb-xs">
              {{ user.name }}
            </div>
            <div class="username text-subtitle2 text-grey q-mb-sm">@{{ user.username }}</div>
            <div
              style="max-width: 600px; white-space: pre-wrap"
              class="text-body2 text-grey bio-text"
              :class="{ 'bio--clamped': !showMore }"
            >
              {{ user.bio }}
            </div>
            <q-btn
              v-if="hasExtraInfo"
              flat
              small
              class="q-mt-sm"
              :label="showMore ? 'Less' : 'More'"
              :icon-right="showMore ? 'expand_less' : 'chevron_right'"
              @click="showMore = !showMore"
            />
            <div v-if="showMore && false" class="extra-info q-mt-sm text-body2 text-grey">
              <q-list bordered padding class="q-px-xl">
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
            </div>
          </div>
        </div>
      </div>

      <div v-if="tab != 'settings'" class="counts-row q-my-md">
        <ProfileCounts @tab="setTab" />
      </div>

      <!-- TABS CONTENT -->
      <div class="tabs-container">
        <q-tab-panels v-model="tab" animated class="panel-content">
          <!-- POSTS -->
          <q-tab-panel name="posts" class="panel-content">
            <PostsTab ref="postsTabRef" :user-id="userStore.user ? userStore.user.id : null" />
          </q-tab-panel>

          <!-- FOLLOWING -->
          <q-tab-panel name="following" class="panel-content">
            <FollowingTab ref="followingTabRef" />
          </q-tab-panel>

          <!-- FOLLOWERS -->
          <q-tab-panel name="followers" class="panel-content">
            <FollowersTab ref="followersTabRef" />
          </q-tab-panel>

          <q-tab-panel name="settings" class="panel-content">
            <div id="edit">
              <q-form class="col-8" @submit.prevent="updateProfile">
                <q-input
                  v-model="edit.name"
                  label="Name"
                  bottom-slots
                  hide-bottom-space
                  :dense="true"
                  :color="
                    nameStatus.valid === true
                      ? 'positive'
                      : nameStatus.valid === false
                        ? 'negative'
                        : undefined
                  "
                  :error="nameStatus.valid === false"
                  :success="nameStatus.valid === true"
                  :input-props="commonInputProps"
                  class="q-mb-sm"
                >
                  <!-- error slot -->
                  <template #error>
                    <div class="text-negative text-caption">
                      {{ nameStatus.message }}
                    </div>
                  </template>

                  <!-- success/info slot -->
                  <template #after>
                    <div v-if="nameStatus.valid === true" class="text-positive text-caption">
                      {{ nameStatus.message }}
                    </div>
                  </template>
                </q-input>

                <q-input
                  v-model="edit.username"
                  label="Username"
                  bottom-slots
                  hide-bottom-space
                  :rules="[validateUsernameFormat]"
                  :loading="usernameStatus.loading"
                  :error="usernameStatus.available === false"
                  :success="usernameStatus.available === true"
                  :color="
                    usernameStatus.available === true
                      ? 'positive'
                      : usernameStatus.available === false
                        ? 'negative'
                        : undefined
                  "
                  class="q-mb-sm"
                >
                  <!-- only shows when error=true -->
                  <template #error>
                    <div class="text-negative text-caption">
                      {{ usernameStatus.message }}
                    </div>
                  </template>

                  <!-- only shows when success=true -->
                  <template #after>
                    <div
                      v-if="usernameStatus.available === true"
                      class="text-positive text-caption row items-center"
                    >
                      <q-icon name="check_circle" size="14px" class="q-mr-xs" />
                      {{ usernameStatus.message }}
                    </div>
                  </template>
                </q-input>

                <q-input
                  v-model="edit.bio"
                  label="Bio"
                  style="font-size: 11px; resize: none"
                  type="textarea"
                  bottom-slots
                  hide-bottom-space
                  :dense="true"
                  :color="
                    bioStatus.valid === true
                      ? 'positive'
                      : bioStatus.valid === false
                        ? 'negative'
                        : undefined
                  "
                  :error="bioStatus.valid === false"
                  :success="bioStatus.valid === true"
                  :input-props="commonInputProps"
                  class="q-mb-sm"
                >
                  <template #error>
                    <div class="text-negative text-caption">
                      {{ bioStatus.message }}
                    </div>
                  </template>
                  <template #after>
                    <div v-if="bioStatus.valid === true" class="text-positive text-caption">
                      {{ bioStatus.message }}
                    </div>
                  </template>
                </q-input>

                <h6>Contact Settings</h6>
                <q-input
                  v-model="edit.contact.blog"
                  label="Blog URL"
                  type="url"
                  bottom-slots
                  hide-bottom-space
                  :dense="true"
                  :color="
                    blogStatus.valid === true
                      ? 'positive'
                      : blogStatus.valid === false
                        ? 'negative'
                        : undefined
                  "
                  :error="blogStatus.valid === false"
                  :success="blogStatus.valid === true"
                  :input-props="commonInputProps"
                  class="q-mb-sm"
                >
                  <template #error>
                    <div class="text-negative text-caption">
                      {{ blogStatus.message }}
                    </div>
                  </template>
                  <template #after>
                    <div v-if="blogStatus.valid === true" class="text-positive text-caption">
                      {{ blogStatus.message }}
                    </div>
                  </template>
                </q-input>

                <q-input
                  v-model="edit.contact.twitter"
                  label="Twitter Handle"
                  bottom-slots
                  hide-bottom-space
                  :dense="true"
                  :color="
                    twitterStatus.valid === true
                      ? 'positive'
                      : twitterStatus.valid === false
                        ? 'negative'
                        : undefined
                  "
                  :error="twitterStatus.valid === false"
                  :success="twitterStatus.valid === true"
                  :input-props="commonInputProps"
                  class="q-mb-sm"
                >
                  <template #error>
                    <div class="text-negative text-caption">
                      {{ twitterStatus.message }}
                    </div>
                  </template>
                  <template #after>
                    <div v-if="twitterStatus.valid === true" class="text-positive text-caption">
                      {{ twitterStatus.message }}
                    </div>
                  </template>
                </q-input>

                <q-input
                  v-model="edit.contact.phone"
                  label="Phone Number"
                  type="tel"
                  bottom-slots
                  hide-bottom-space
                  :dense="true"
                  :color="
                    phoneStatus.valid === true
                      ? 'positive'
                      : phoneStatus.valid === false
                        ? 'negative'
                        : undefined
                  "
                  :error="phoneStatus.valid === false"
                  :success="phoneStatus.valid === true"
                  :input-props="commonInputProps"
                  class="q-mb-sm"
                >
                  <template #error>
                    <div class="text-negative text-caption">
                      {{ phoneStatus.message }}
                    </div>
                  </template>
                  <template #after>
                    <div v-if="phoneStatus.valid === true" class="text-positive text-caption">
                      {{ phoneStatus.message }}
                    </div>
                  </template>
                </q-input>
                <div class="q-mt-md" style="display: flex; justify-content: flex-end">
                  <q-btn
                    type="submit"
                    class="full-width"
                    label="Save"
                    :loading="saving"
                    flat
                    dense
                    style="border: 1px solid; opacity: 0.6"
                  />
                </div>
              </q-form>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </div>

      <div v-if="$q.screen.lt.md" class="tabs_bottom fixed-bottom">
        <q-tabs
          v-model="tab"
          class="tabs-bar"
          align="justify"
          dense
          :class="$q.dark.isActive ? 'bg-dark text-white' : 'bg-white text-primary'"
        >
          <q-tab name="posts" :label="$q.screen.lt.md ? '' : 'Posts'" icon="article" />
          <q-tab name="following" :label="$q.screen.lt.md ? '' : 'Following'" icon="person_add" />
          <q-tab name="followers" :label="$q.screen.lt.md ? '' : 'Followers'" icon="people" />
          <q-tab name="settings">
            <i class="fas fa-user-edit" style="font-size: 1.2rem"></i>
            <span v-if="!$q.screen.lt.md" style="padding-top: 5px">Edit Profile</span>
          </q-tab>
        </q-tabs>
      </div>
    </div>
  </q-page>
</template>
<script setup>
import FollowingTab from './tabs/FollowingTab.vue'
import FollowersTab from './tabs/FollowersTab.vue'
import PostsTab from './tabs/PostsTab.vue'
import ProfileCounts from './tabs/ProfileCounts.vue'
import { getAvatarSrc } from '../composables/formater'
import { ref, onMounted, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useUserStore } from 'stores/user'
import { useRoute, useRouter } from 'vue-router'
import { throttle } from 'quasar'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const $q = useQuasar()
const loading = ref(true)
const tab = ref('posts')
const showMore = ref(false)
const saving = ref(false)

const followingTabRef = ref(null)
const followersTabRef = ref(null)
const postsTabRef = ref(null)

function setTabFromRoute() {
  const t = route.query.tab
  if (t === 'following' || t === 'followers' || t === 'settings') {
    tab.value = t
  } else {
    tab.value = 'posts'
  }
}

function setTab(t) {
  tab.value = t
}

setTabFromRoute()

watch(
  () => route.query.tab,
  () => {
    setTabFromRoute()
  },
)

watch(tab, (newTab) => {
  if (route.query.tab !== newTab) {
    router.replace({
      path: '/profile',
      query: { tab: newTab },
    })
  }
})

const usernameStatus = ref({
  loading: false,
  available: null,
  message: '',
})
let usernameTimeout = null
const nameStatus = ref({ valid: null, message: '' })
const bioStatus = ref({ valid: null, message: '' })
const blogStatus = ref({ valid: null, message: '' })
const twitterStatus = ref({ valid: null, message: '' })
const phoneStatus = ref({ valid: null, message: '' })
const commonInputProps = {
  autocapitalize: 'none',
  autocorrect: 'off',
  autocomplete: 'off',
  spellcheck: false,
  inputmode: 'verbatim',
}

const user = ref({
  avatar: '',
  name: '',
  username: '',
  bio: '',
  contact: {
    phone: '',
    blog: '',
    twitter: '',
  },
})
const edit = ref({
  name: '',
  username: '',
  bio: '',
  contact: {
    phone: '',
    blog: '',
    twitter: '',
  },
})
const avatarInput = ref(null)

const hasExtraInfo = computed(() => {
  const c = user.value.contact
  return c.phone || c.blog || c.twitter
})

async function fetchProfile() {
  return {
    avatar: getAvatarSrc(userStore.user.avatar),
    name: userStore.user.name,
    username: userStore.user.username,
    bio: userStore.user.bio,
    contact: userStore.user.contact,
  }
}

async function init() {
  loading.value = true
  try {
    await userStore.fetchUsersData()

    const profile = await fetchProfile()
    user.value = profile
    edit.value = JSON.parse(JSON.stringify(profile))
  } catch (err) {
    console.error('Init failed:', err)
    $q.notify({ type: 'negative', message: 'Couldn’t load your profile.' })
  } finally {
    loading.value = false
  }
}

const validateName = (val) => {
  if (!val) {
    return 'Full name is required'
  }

  if (val.split(' ').length > 3) {
    return 'Name too long. Please enter upto three names.'
  }

  if (val.length > 30) {
    return 'Too many characters for a name.'
  }
  const regex = /^[A-Za-z'-]+(?:\s+[A-Za-z'-]+)+$/
  if (!regex.test(val)) {
    return 'Enter at least first and last name (letters, hyphens, apostrophes only)'
  }
  return null
}

const validateUsernameFormat = (val) => {
  if (!val) {
    return 'Username is required'
  }
  if (val.length < 4) {
    return 'At least 4 characters'
  }
  if (val.length > 15) {
    return 'username too long. '
  }
  if (!/^[a-z0-9._]+$/.test(val)) {
    return 'Only lowercase letters, numbers, “.” and “_”'
  }
  return null
}

const validateBio = (val) => {
  if (val && val.length > 160) {
    return 'Bio must be 160 characters or less'
  }
  return null
}

const validatePhone = (val) => {
  if (val && !/^\+?[0-9\- ]{7,15}$/.test(val)) {
    return 'Enter a valid phone number'
  }
  return null
}

const validateURL = (val) => {
  if (val) {
    try {
      new URL(val)
      return null
    } catch {
      return 'Enter a valid URL'
    }
  }
  return null
}

const validateTwitter = (val) => {
  if (val && !/^@?(\w){1,15}$/.test(val)) {
    return 'Enter a valid Twitter handle (up to 15 chars, letters/numbers/underscore)'
  }
  return null
}

async function updateProfile() {
  const { name, username, bio, contact } = edit.value
  saving.value = true

  // 1. Name
  let err = validateName(name)
  if (err) {
    $q.notify({ type: 'negative', message: err })
    return
  }

  // 2. Username
  err = validateUsernameFormat(username)
  if (err) {
    $q.notify({ type: 'negative', message: err })
    return
  }

  // 3. Bio
  err = validateBio(bio)
  if (err) {
    $q.notify({ type: 'negative', message: err })
    return
  }

  // 4. Contact.phone
  err = validatePhone(contact.phone)
  if (err) {
    $q.notify({ type: 'negative', message: err })
    return
  }

  // 5. Contact.blog URL
  err = validateURL(contact.blog)
  if (err) {
    $q.notify({ type: 'negative', message: err })
    return
  }

  // 6. Contact.twitter
  err = validateTwitter(contact.twitter)
  if (err) {
    $q.notify({ type: 'negative', message: err })
    return
  }

  // --- All validations passed! ---
  try {
    // Option A: merge locally

    // Option B: send to server
    await api.post('/users/edit/profile', edit.value)
    //console.log(res.data)

    user.value = {
      ...user.value,
      ...edit.value,
    }

    $q.notify({ type: 'positive', message: 'Profile updated!' })
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: 'Failed to update profile. Please try again.',
    })
  } finally {
    saving.value = false
  }
}

function focusAvatar() {
  avatarInput.value.click()
}

async function onAvatarSelected(event) {
  const file = event.target.files[0]
  if (!file) {
    $q.notify({ type: 'warning', message: 'No file selected.' })
    return
  }

  // 1. Only images
  if (!file.type.startsWith('image/')) {
    $q.notify({ type: 'negative', message: 'Please select a valid image file.' })
    return
  }

  // 2. File size: 50 KB – 5 MB
  const sizeKB = file.size / 1024
  const sizeMB = file.size / (1024 * 1024)
  if (sizeKB < 50) {
    $q.notify({
      type: 'negative',
      message: `Image too small (${Math.round(sizeKB)} KB). Minimum 50 KB.`,
    })
    return
  }
  if (sizeMB > 5) {
    $q.notify({
      type: 'negative',
      message: `Image too large (${sizeMB.toFixed(1)} MB). Max 5 MB.`,
    })
    return
  }

  // 3. Check dimensions/aspect ratio
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = async () => {
      const { width, height } = img
      if (width < 128 || height < 128) {
        $q.notify({
          type: 'negative',
          message: `Image too small (${width}×${height}). Min 128×128.`,
        })
        return
      }
      const ratio = width / height
      if (Math.abs(ratio - 1) > 0.1) {
        $q.notify({ type: 'negative', message: 'Please use a nearly square image (1:1 aspect).' })
        return
      }

      // 4. Upload with progress toast
      const notif = $q.notify({
        message: 'Uploading avatar...',
        caption: '0%',
        spinner: true,
        timeout: 0,
        group: false,
      })

      try {
        const formData = new FormData()
        formData.append('avatar', file)

        await api.post('/users/upload/profile-picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            notif({ caption: `${percent}%` })
          },
        })

        // Success
        user.value.avatar = URL.createObjectURL(file)
        await userStore.fetchUsersData()
        notif({
          spinner: false,
          icon: 'done',
          message: 'Avatar loaded successfully!',
          caption: '',
          timeout: 2000,
        })
      } catch (error) {
        console.error('Upload failed:', error)
        notif({
          spinner: false,
          icon: 'error',
          type: 'negative',
          message: 'Failed to upload avatar. Please try again.',
          timeout: 3000,
        })
      }
    }
    img.onerror = () => {
      $q.notify({ type: 'negative', message: 'Failed to load the image.' })
    }
    img.src = e.target.result
  }
  reader.onerror = () => {
    $q.notify({ type: 'negative', message: 'Error reading file.' })
  }
  reader.readAsDataURL(file)
}

watch(
  () => edit.value.username,
  (newUsername) => {
    edit.value.username = newUsername.toLowerCase()
  },
)

watch(
  () => edit.value.username,
  (newVal) => {
    // Reset status
    usernameStatus.value = { loading: false, available: null, message: '' }

    // Clear any pending timer
    clearTimeout(usernameTimeout)

    // First check local format
    const formatError = validateUsernameFormat(newVal)
    if (formatError) {
      usernameStatus.value.available = false
      usernameStatus.value.message = formatError
      return
    }

    // Debounce before hitting the server
    usernameStatus.value.loading = true
    usernameTimeout = setTimeout(async () => {
      try {
        const res = await api.post('/users/username/check', { username: newVal })
        const { available, message } = res.data
        usernameStatus.value.available = available
        usernameStatus.value.message = available ? 'Username is free!' : message || 'Taken'
      } catch {
        usernameStatus.value.available = false
        usernameStatus.value.message = 'Check failed. Try again.'
      } finally {
        usernameStatus.value.loading = false
      }
    }, 500)
  },
)

watch(
  () => edit.value.name,
  (val) => {
    const err = validateName(val)
    nameStatus.value.valid = !err
    nameStatus.value.message = err || ''
  },
)

watch(
  () => edit.value.bio,
  (val) => {
    const err = validateBio(val)
    bioStatus.value.valid = !err
    bioStatus.value.message = err || ''
  },
)

watch(
  () => edit.value.contact.blog,
  (val) => {
    const err = validateURL(val)
    blogStatus.value.valid = !err
    blogStatus.value.message = err || ''
  },
)

watch(
  () => edit.value.contact.twitter,
  (val) => {
    const err = validateTwitter(val)
    twitterStatus.value.valid = !err
    twitterStatus.value.message = err || ''
  },
)

watch(
  () => edit.value.contact.phone,
  (val) => {
    const err = validatePhone(val)
    phoneStatus.value.valid = !err
    phoneStatus.value.message = err || ''
  },
)

function onNearBottom(e) {
  const el = e.target
  const dist = el.scrollHeight - (el.scrollTop + el.clientHeight)
  if (dist <= 300) {
    if (tab.value === 'following') {
      followingTabRef.value?.fetchFollowing()
    }
    if (tab.value === 'followers') {
      followersTabRef.value?.fetchFollowers()
    }

    if (tab.value === 'posts') {
      postsTabRef.value?.fetchPosts()
    }
  }
}
const handleScroll = throttle(onNearBottom, 50)

// add this:
const formattedPhone = computed(() => {
  const raw = user.value.contact.phone
  if (!raw) return ''
  // simple formatter, tweak to your needs:
  const digits = raw.replace(/\D/g, '')
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : raw
})

const twitterUrl = computed(() => {
  const handle = user.value.contact?.twitter?.replace(/^@/, '')
  return handle ? `https://x.com/${handle}` : ''
})

onMounted(init)
</script>

<style scoped lang="scss">
.profile-page {
  max-width: 800px;
  margin: auto;
  display: flex;
  flex-direction: column;
}
.profile-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.avatar-skel {
  width: 120px;
  height: 120px;
  border-radius: 50%;
}
.avatar-skel-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.avatar-wrapper {
  position: relative;
}
.edit-icon {
  position: absolute;
  font-size: 15px;
  font-weight: 1000;
  bottom: 5px;
  right: 14px;
  border-radius: 50%;
  border: 1px solid #555555;
  cursor: pointer;

  &:active {
    background: #ddd;
    transform: scale(0.92);
  }
}

.tabs-container {
  padding-bottom: 56px;
}
.panel-content {
  padding-bottom: 16px;
}
.list-item {
  padding: 8px 0;
}
.btn-skel {
  border-radius: 4px;
}

.tabs_bottom {
  display: flex;
  justify-content: center;
  align-items: center;
}

.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 10;
}
.tabs-bar {
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  padding-bottom: 10px;
  max-width: 600px;
  width: 100%;
}
.username {
  color: gray;
}
.extra-info a {
  text-decoration: none;
  color: $teal-base;
}

.username-input-wrapper {
  position: relative;
}

.username-input-wrapper .username-error,
.username-input-wrapper .username-success {
  position: absolute;
  left: 0;
  bottom: -18px; /* pull it up tight under the border */
  margin: 0;
}

.bio--clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; /* limit to 2 lines */
  overflow: hidden; /* hide the rest */
  text-overflow: ellipsis; /* show “…” */
}
</style>
