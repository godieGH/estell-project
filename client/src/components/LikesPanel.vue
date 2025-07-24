<template>
  <div v-if="loading">
    <q-item v-for="n in 20" :key="n" class="q-py-sm flex items-center" style="height: 72px">
      <q-item-section avatar>
        <q-skeleton type="circle" width="40px" height="40px" />
      </q-item-section>
      <q-item-section class="q-pl-md" style="flex: 1">
        <q-skeleton type="text" width="30%" />
        <q-skeleton type="text" width="50%" class="q-mt-xs" />
      </q-item-section>
    </q-item>
  </div>

  <NoItemPlaceholder v-else-if="noItem" @reload="fetchItems" />

  <div
    v-else
    style="position: relative"
    :style="$q.screen.width > 1024 ? 'overflow-y: auto; height: 100vh; padding-bottom: 50px;' : ''"
  >
    <q-item
      v-for="user in likers"
      :key="user"
      class="q-py-sm flex items-center"
      style="height: 72px"
    >
      <q-item-section style="cursor: pointer" @click="PreviewUser(user.id)" avatar>
        <q-avatar size="40px">
          <img :src="getAvatarSrc(user.avatar)" />
        </q-avatar>
      </q-item-section>
      <q-item-section class="q-pl-md" style="flex: 1">
        <div class="text-grey">@{{ user.username }}</div>
        <div>
          {{ user.name }}
          <span class="text-grey" style="font-size: 10px; padding-left: 10px"
            >• {{ formatTime(user.Like.createdAt) }}</span
          ><i class="fas fa-heart" style="font-size: 8px; padding-left: 16px; color: red"></i>
        </div>
      </q-item-section>
    </q-item>
  </div>

  <q-dialog v-model="showDrawer" :maximized="true" position="bottom" transition-show="slide-up">
    <q-card style="max-width: 800px" :style="`height: ${$q.screen.height}px;`">
      <div class="q-mt-md" style="position: sticky; top: 0; z-index: 1; padding: 8px">
        <q-btn flat round icon="close" @click="showDrawer = false" />
        <span style="margin-left: 8px">Profile</span>
      </div>
      <div>
        <ProfilePreview :post="{ user: { id: activeUserId } }" />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import ProfilePreview from 'components/ProfilePreview.vue'
import { api } from 'boot/axios'
import { ref, onMounted } from 'vue'
import { formatTime, getAvatarSrc } from '../composables/formater'
import { useQuasar } from 'quasar'

const props = defineProps({
  post: { type: Object, required: true },
})

const $q = useQuasar()
const likers = ref([])
const noItem = ref(false)
const loading = ref(false)
const post_id = props.post.id

const activeUserId = ref(null)
const showDrawer = ref(false)
function PreviewUser(id) {
  activeUserId.value = id
  showDrawer.value = true
}

async function fetchLikers() {
  loading.value = true
  noItem.value = false

  try {
    const { data } = await api.get(`/posts/${post_id}/get/all/likers`)
    if (!data || data.length === 0) {
      noItem.value = true
      likers.value = []
    } else {
      likers.value = data
    }
  } catch (err) {
    console.error(err)
    noItem.value = true
    likers.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchLikers)

function fetchItems() {
  fetchLikers()
}
</script>
