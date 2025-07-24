<template>
  <div v-if="loading">
    <q-item v-for="n in 3" :key="n" class="q-py-sm flex items-center" style="height: 72px">
      <q-item-section avatar>
        <q-skeleton type="circle" width="40px" height="40px" />
      </q-item-section>
      <q-item-section class="q-pl-md" style="flex: 1">
        <q-skeleton type="text" width="30%" />
      </q-item-section>
    </q-item>
  </div>

  <div v-else>
    <q-item
      v-for="user in mentions"
      clickable
      :key="user"
      @click="PreviewUser(user.id)"
      class="q-py-sm flex items-center hover-efect"
      style="height: 72px"
    >
      <q-item-section avatar>
        <q-avatar type="circle" size="40px">
          <img :src="getAvatarSrc(user.avatar)" />
        </q-avatar>
      </q-item-section>
      <q-item-section class="q-pl-sm" style="flex: 1">
        <span class="text-grey">@{{ user.username }}</span>
      </q-item-section>
      <div class="text-grey" style="width: 50px; text-align: right">
        <i class="fas fa-chevron-right"></i>
      </div>
    </q-item>
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
</template>

<script setup>
import ProfilePreview from 'components/ProfilePreview.vue'
import { api } from 'boot/axios'
import { onMounted, ref } from 'vue'
import { getAvatarSrc } from '../composables/formater'

const props = defineProps({
  post: Object,
})

const activeUserId = ref(null)
const showDrawer = ref(false)

function PreviewUser(id) {
  activeUserId.value = id
  showDrawer.value = true
}

const mentionTags = props.post.keywords.mentions
const mentions = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true

  try {
    mentionTags.forEach(async (val) => {
      const { data } = await api.get(`/posts/mentioned/user/${val.id}/`)
      mentions.value.push(data)
      loading.value = false
    })
  } catch (err) {
    console.error(err)
  }
})
</script>

<style scoped lang="scss">
.hover-efect {
  cursor: pointer;
  &:active {
    background: #b5b5b567;
  }
}
</style>
