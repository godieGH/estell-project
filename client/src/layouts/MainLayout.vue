<template>
  <q-layout view="hHh lpR fFf" style="height: 100vh">
    <!-- Side Drawer for navigation on larger screens -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :mini="isCollapsed"
      :mini-width="56"
      :width="200"
    >
      <div class="column full-height">
        <!-- top toggle + list -->
        <div>
          <div class="row justify-end items-center q-pa-sm">
            <q-btn
              dense
              flat
              round
              :icon="isCollapsed ? 'chevron_right' : 'chevron_left'"
              @click="toggleCollapse"
            />
          </div>
          <q-separator />
          <div class="fit">
            <q-list padding>
              <q-item clickable v-ripple to="/" exact :active="$route.path === '/'">
                <q-item-section avatar>
                  <q-icon name="home" />
                </q-item-section>
                <q-item-section v-if="!isCollapsed"> For You </q-item-section>
              </q-item>

              <q-item clickable v-ripple to="/people" :active="$route.path.startsWith('/people')">
                <q-item-section avatar>
                  <q-icon name="people" />
                </q-item-section>
                <q-item-section v-if="!isCollapsed"> People </q-item-section>
              </q-item>

              <!-- after: show expansion on desktop, simple link on mobile -->
              <template v-if="leftDrawerOpen">
                <q-expansion-item
                  v-model="profileExpand"
                  dense
                  expand-separator
                  :default-opened="$route.path.startsWith('/profile')"
                  expand-icon="0"
                  expand-icon-class="hidden"
                  header-inset-level="0"
                >
                  <template v-slot:header>
                    <q-item
                      clickable
                      :style="isCollapsed ? 'transform: translateX(-10px);' : ''"
                      v-ripple
                      class="header-no-padding"
                    >
                      <q-item-section
                        avatar
                        @click="isCollapsed = isCollapsed ? false : isCollapsed"
                      >
                        <q-avatar size="30px">
                          <img :src="userAvatarSrc" />
                        </q-avatar>
                      </q-item-section>

                      <!-- Label -->
                      <q-item-section>
                        <q-item-label>Profile</q-item-label>
                      </q-item-section>

                      <!-- Custom Chevron Only -->
                      <q-item-section side>
                        <q-icon :name="profileExpand ? 'chevron_left' : 'chevron_right'" />
                      </q-item-section>
                    </q-item>
                  </template>

                  <q-list dense padding class="profile-children-list">
                    <q-item
                      clickable
                      v-ripple
                      :to="{ path: '/profile', query: { tab: 'posts' } }"
                      :active="$route.path.startsWith('/profile') && $route.query.tab === 'posts'"
                    >
                      <q-item-section>Posts</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-ripple
                      :to="{ path: '/profile', query: { tab: 'following' } }"
                      :active="
                        $route.path.startsWith('/profile') && $route.query.tab === 'following'
                      "
                    >
                      <q-item-section>Following</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-ripple
                      :to="{ path: '/profile', query: { tab: 'followers' } }"
                      :active="
                        $route.path.startsWith('/profile') && $route.query.tab === 'followers'
                      "
                    >
                      <q-item-section>Followers</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-ripple
                      :to="{ path: '/profile', query: { tab: 'settings' } }"
                      :active="
                        $route.path.startsWith('/profile') && $route.query.tab === 'settings'
                      "
                    >
                      <q-item-section>Edit</q-item-section>
                    </q-item>
                  </q-list>
                </q-expansion-item>
              </template>
              <template v-else>
                <!-- mobile: simple link -->
                <q-item
                  clickable
                  v-ripple
                  to="/profile"
                  :active="$route.path.startsWith('/profile')"
                >
                  <q-item-section avatar>
                    <q-icon name="person" />
                  </q-item-section>
                  <q-item-section v-if="!isCollapsed"> Profile </q-item-section>
                </q-item>
              </template>
            </q-list>
          </div>
        </div>

        <!-- bottom actions: only on desktop -->
        <div class="q-pa-sm" style="margin-top: auto" v-if="leftDrawerOpen">
          <q-separator />
          <q-list padding class="no-wrap">
            <q-item clickable v-ripple to="/create">
              <q-item-section avatar><q-icon name="add" /></q-item-section>
              <q-item-section>Create</q-item-section>
            </q-item>
            <q-item clickable v-ripple @click="$refs.settingsPanel.open()">
              <q-item-section avatar><q-icon name="settings" /></q-item-section>
              <q-item-section>Settings</q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </q-drawer>
    <!-- Header -->
    <q-header elevated :class="[$q.dark.isActive ? 'bg-dark text-white' : 'bg-white text-primary']">
      <q-toolbar>
        <q-toolbar-title class="row items-center">
          <img style="margin: 6px 0 0 8px" :src="logoSrc" height="35" />
        </q-toolbar-title>

        <SettingsPanel ref="settingsPanel" />
        <SearchPanel ref="searchPanel" />
        <!-- Desktop: hide “add” -->
        <q-btn
          v-if="$q.screen.lt.md"
          @click="openCreatePanel()"
          flat
          dense
          round
          icon="add"
          aria-label="Create"
        />
        <q-btn flat dence round size="12px" icon="fab fa-instagram" />
        <!-- Desktop: wide rounded search button -->
        <template v-if="leftDrawerOpen">
          <q-btn
            flat
            rounded
            dense
            outline
            class="q-mx-sm"
            style="min-width: 200px; border: 1px solid #8383837d; padding: 0"
            @click="$refs.searchPanel.open()"
          >
            <template v-slot:default>
              <div style="padding: 5px 18px; width: 100%; text-align: left; text-transform: none">
                <span class="text-grey-6" style="text-transform: none"> Search here... </span>
              </div>
            </template>
          </q-btn>
        </template>

        <!-- Mobile: original search icon -->
        <template v-else>
          <q-btn
            flat
            dense
            round
            icon="search"
            aria-label="Search"
            @click="$refs.searchPanel.open()"
          />
        </template>

        <q-btn
          flat
          dence
          round
          size="12px"
          icon="fab fa-facebook-messenger"
          @click="() => (showMessenger = true)"
        />

        <q-dialog maximized v-model="showMessenger">
          <q-card class="q-pa-sm" style="overflow-y: hidden; max-width: 1200px">
            <div>
              <div class="q-mb-sm" style="display: flex; align-items: center">
                <i v-close-popup class="q-pr-sm fas fa-chevron-left"></i>
                <img :src="logoSrc" height="35" />
              </div>
            </div>
            <div>
              <MessengerPanel />
            </div>
          </q-card>
        </q-dialog>

        <!-- Always present: dark/light toggle -->
        <q-btn
          flat
          dense
          round
          :loading="isChangingTheme"
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          @click="toggleDarkMode"
          aria-label="Toggle theme"
        />

        <!-- Mobile: original Settings icon -->
        <template v-if="$q.screen.lt.md">
          <q-btn
            flat
            dense
            round
            icon="settings"
            aria-label="Settings"
            @click="$refs.settingsPanel.open()"
          />
        </template>
      </q-toolbar>

      <!-- On small screens, show tabs in header if desired -->
      <q-tabs
        v-if="$q.screen.lt.md"
        dense
        align="justify"
        narrow-indicator
        :class="$q.dark.isActive ? 'text-white' : 'text-primary'"
      >
        <q-route-tab to="/people" label="People" />
        <q-route-tab to="/" exact label="For You" />
        <q-route-tab to="/profile" label="Profile" />
      </q-tabs>
    </q-header>

    <!-- Main Content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer style="z-index: 9999999" v-if="footerStatus">
      <div v-if="!isOnline" class="q-pa-xs q-py-sm bg-dark">
        <i style="font-size: 18px" class="material-icons">wifi_off</i> You're offline. Please check
        your Internet connection.
      </div>
      <div
        v-else
        class="q-pa-xs bg-dark"
        style="display: flex; justify-content: space-between; align-items: center"
      >
        <div><i class="material-icons q-px-sm" style="font-size: 20px">wifi</i> Back Online</div>
        <q-btn @click="footerStatus = false" flat dense icon="close" />
      </div>
    </q-footer>

    <q-dialog v-model="showDrawer" position="bottom" transition-show="slide-up">
      <q-card style="height: 100vh; border-radius: 10px">
        <div style="flex: 0 0 auto; position: sticky; top: 0; z-index: 1; padding: 8px">
          <div
            :style="$q.dark.isActive ? 'background: var(--q-dark);' : 'background: #fff;'"
            style="display: flex; justify-content: space-between; align-items: center"
          >
            <span style="margin-left: 8px"> <i class="material-icons">public</i> Create Post </span>
            <q-btn flat round icon="close" @click="showDrawer = false" />
          </div>
        </div>
        <div style="flex: 1 1 auto; overflow-y: auto; padding: 8px">
          <CreatePanel />
        </div>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import SettingsPanel from 'components/SettingsPanel.vue'
import CreatePanel from 'components/CreatePanel.vue'
import SearchPanel from 'components/SearchPanel.vue'
import MessengerPanel from 'components/MessengerPanel.vue'
import { api } from 'boot/axios'
import { socket } from 'boot/socket'
import { ref, watch, onMounted, computed, onBeforeUnmount, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from 'stores/user'
import { useSettingsStore } from 'stores/SettingsStore'
import { useMessageStore } from 'stores/messageStore'
import { useMsgStore } from 'stores/messages'
import { getAvatarSrc } from '../composables/formater'
import { debounce } from 'quasar'

const router = useRouter()
const $q = useQuasar()
const imb = useMsgStore()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const messageStore = useMessageStore()

const profileExpand = ref(false)
const route = useRoute()
watch(
  () => route.path,
  (val) => {
    if (val.startsWith('/profile')) {
      profileExpand.value = true
    }
  },
)

const logoSrc = computed(() => {
  const mode = $q.dark.isActive ? 'white' : process.env.VITE_LOGO_COLOR; // can be dark or red in the .env file
  return new URL(`../assets/e-logo-${mode}.png`, import.meta.url).href
})

const showMessenger = ref(false)
const leftDrawerOpen = ref(false)
const isCollapsed = ref(true)
const showDrawer = ref(false)
const isChangingTheme = ref(false)
const idx = ref(null)

const userAvatarSrc = computed(() => getAvatarSrc(userStore.user.avatar))

function openCreatePanel() {
  showDrawer.value = true
}

// === Status Management Refs ===
const footerStatus = ref(false)
const isOnline = ref(true)
const networkIsOnline = ref(navigator.onLine)

// Debounced function to hide the footer after a delay
const hideFooter = debounce(() => {
  footerStatus.value = false
}, 3500)

// Function to check the server's health
const checkServerStatus = async () => {
  if (!networkIsOnline.value) {
    // If there's no network, no need to even try
    return false
  }
  try {
    const response = await api.get('/api/')
    getConversations()
    // Check if the response from the server is what we expect
    return response.status === 200 && response.data.status === 'ok'
  } catch (err) {
    console.error('Server check failed:', err.message)
    return false
  }
}

// Main function to update the online/offline status
const updateStatus = async () => {
  // Update network status first
  networkIsOnline.value = navigator.onLine

  // Perform the server check
  const serverIsAccessible = await checkServerStatus()

  // The overall online status is a combination of network and server health
  isOnline.value = networkIsOnline.value && serverIsAccessible
}

onMounted(async () => {
  // Check user authentication first
  const needLogin = await userStore.initialize()
  if (needLogin) {
    router.push('/auth/login')
    return
  }

  // Initialize the token refresh interval
  idx.value = setInterval(
    async function () {
      try {
        const { data } = await api.post('/users/token/refresh')
        userStore.setUser(data.user, data.accessToken)
      } catch (err) {
        console.log(err.message)
      }
    },
    15 * 60 * 1000,
  )

  //getConversations()
  imb.initializeStore()
  messageStore.initializeStore()
  socket.on('refresh', () => {
    getConversations()
  })

  await settingsStore.fetcUserPreferedSettings()
  $q.dark.set(settingsStore.dark)

  // === Integration starts here ===
  // 1. Initial status check on mount
  await updateStatus()

  // 2. Set up event listeners for network changes
  window.addEventListener('online', updateStatus)
  window.addEventListener('offline', updateStatus)

  // 3. Set up socket listeners. The socket's status also informs our overall status.
  socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason)
    updateStatus()
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error)
    updateStatus()
  })

  socket.on('connect', () => {
    console.log('Successifully connected to server')
    updateStatus()
  })
})

async function getConversations() {
  try {
    const { data } = await api.get('/api/rooms')
    socket.emit('create_room', data)
  } catch (err) {
    console.error(err.message)
  }
}

onBeforeUnmount(() => {
  // Clean up event listeners
  window.removeEventListener('online', updateStatus)
  window.removeEventListener('offline', updateStatus)

  if (socket) {
    socket.disconnect()
  }
})

onUnmounted(() => {
  // Clear the refresh interval
  clearInterval(idx.value)
})

// Watcher for the main online status
watch(isOnline, (newValue) => {
  if (newValue) {
    footerStatus.value = true // Show the "online" message briefly
    hideFooter() // Hide it after the delay
  } else {
    footerStatus.value = true // Immediately show the "offline" message
    hideFooter.cancel() // Cancel any pending hide operation
  }
})

// === Other component methods ===
async function toggleDarkMode() {
  isChangingTheme.value = true
  try {
    await settingsStore.updateSettings('dark', !$q.dark.isActive)
    $q.dark.set(!$q.dark.isActive)
  } catch (err) {
    $q.notify({
      message: 'Failed to change theme. connection problems',
    })
    console.log(err.message)
  } finally {
    isChangingTheme.value = false
  }
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
:deep(.profile-children-list) {
  position: relative;
  margin-left: 65px;
  padding-left: 8px;
}

/* in your <style scoped> */
.full-height {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.no-wrap .q-item {
  white-space: nowrap;
}

:deep(.profile-children-list)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: rgba(var(--q-primary-rgb), 0.3);
  border-radius: 1px;
}

:deep(.profile-children-list .q-item) {
  position: relative;
}

:deep(.profile-children-list .q-item)::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  width: 8px;
  height: 2px;
  background-color: rgba(var(--q-primary-rgb), 0.3);
  transform: translateY(-50%);
  border-radius: 1px;
}

:deep(.profile-children-list .q-item:hover)::before,
:deep(.profile-children-list .q-item--active)::before {
  background-color: var(--q-primary);
}

:deep(.profile-children-list .q-item--active .q-item__section) {
  font-weight: 600;
  color: var(--q-primary);
}
</style>
