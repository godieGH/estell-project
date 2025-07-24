<template>
  <!-- Right-side drawer: overlay on mobile, sidebar on desktop -->
  <q-drawer
    v-model="drawer"
    side="right"
    :overlay="$q.screen.lt.sm"
    :width="300"
    content-class="bg-white text-primary flex flex-col"
  >
    <!-- Close button inside the drawer -->
    <q-toolbar class="justify-end">
      <q-btn flat round dense icon="close" aria-label="Close" @click="drawer = false" />
    </q-toolbar>

    <!-- Scrollable settings list -->
    <q-scroll-area class="fit">
      <div class="q-pa-md">
        <!-- Appearance Category -->
        <h6 class="q-mb-sm">Appearance</h6>
        <q-list bordered padding>
          <q-item>
            <q-item-section>
              <q-toggle
                :disable="disableToggle"
                v-model="dark"
                label="Dark Mode"
                @update:model-value="onToggleDark"
              />
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Notifications Category -->
        <h6 class="q-mt-md q-mb-sm">Notifications</h6>
        <q-list bordered padding>
          <q-item clickable>
            <q-item-section>
              <q-item-label>Push Notifications</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="settings.push" @update:model-value="onToggle('push', $event)" />
            </q-item-section>
          </q-item>
          <q-item clickable>
            <q-item-section>
              <q-item-label>Email Notifications</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="settings.email" @update:model-value="onToggle('email', $event)" />
            </q-item-section>
          </q-item>
        </q-list>
        <h6 class="q-mt-md q-mb-sm">Media</h6>
        <q-list bordered padding>
          <!-- Auto-play on scroll -->
          <q-item clickable>
            <q-item-section>
              <q-item-label>Auto-play on scroll</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                v-model="settings.autoplay"
                @update:model-value="onToggle('autoplay', $event)"
              />
            </q-item-section>
          </q-item>

          <!-- Global mute/unmute -->
          <q-item clickable>
            <q-item-section>
              <q-item-label>Mute all videos</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="settings.mute" @update:model-value="onToggle('mute', $event)" />
            </q-item-section>
          </q-item>
        </q-list>
        <!-- Account Category -->
        <h6 class="q-mt-md q-mb-sm">Account</h6>
        <q-list bordered padding>
          <q-item clickable @click="goToProfile">
            <q-item-section>
              <q-item-label>Edit Profile</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" />
            </q-item-section>
          </q-item>
          <q-item clickable @click="changePassword">
            <q-item-section>
              <q-item-label>Change Password</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-scroll-area>

    <!-- Logout button at bottom -->
    <div class="q-pa-md">
      <q-btn
        unelevated
        color="negative"
        label="Logout"
        class="full-width"
        :loading="loading"
        :disable="loading"
        @click="logout"
      />
    </div>
  </q-drawer>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useUserStore } from 'stores/user'
import { useSettingsStore } from 'stores/SettingsStore'
import { LocalStorage } from 'quasar'

const $q = useQuasar()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const drawer = ref(false)
const loading = ref(false) // ← loading state
const dark = computed({
  get: () => settingsStore.dark,
  set: (val) => {
    settingsStore.dark = val
  },
})
const disableToggle = ref(false)
const settings = reactive({
  push: LocalStorage.getItem('pref_push') ?? true,
  email: LocalStorage.getItem('pref_email') ?? true,
  autoplay: LocalStorage.getItem('pref_autoplay') ?? false,
  mute: LocalStorage.getItem('pref_mute') ?? false,
})

defineExpose({
  open() {
    drawer.value = true
  },
})

async function onToggleDark(val) {
  disableToggle.value = true
  try {
    await settingsStore.updateSettings('dark', val)
    $q.dark.set(!$q.dark.isActive)
  } catch (err) {
    dark.value = !dark.value
    if (err) {
      $q.notify({
        type: 'negative',
        message: 'Failed to change theme. connection problems',
      })
    }
  } finally {
    disableToggle.value = false
  }
}

async function onToggle(key, val) {
  const oldValue = !val
  try {
    await settingsStore.updateSettings(key, val)
  } catch (err) {
    settings[key] = oldValue
    if (err) {
      $q.notify({
        type: 'negative',
        message: 'Failed to update settings. Check your connection.',
      })
    }
  }
}

function goToProfile() {
  drawer.value = false
  router.push('/profile?tab=settings#edit')
}

function changePassword() {
  drawer.value = false
  router.push('/profile/change-password')
}

async function logout() {
  loading.value = true
  try {
    await userStore.logout()
    drawer.value = false
    router.push('/auth/login')
  } catch (err) {
    // Optionally handle error (e.g. show a notification)
    console.error('Logout failed', err)
  } finally {
    loading.value = false
  }
}
</script>
