<template>
  <div v-if="avatarSrc.length > 0" class="avatar-stack">
    <img v-for="src in avatarSrc" :key="src" :src="getAvatarSrc(src.avatar)" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'
import { getAvatarSrc } from '../../composables/formater'

const props = defineProps(['post_id'])
const postId = props.post_id
const avatarSrc = ref([])

onMounted(async () => {
  try {
    const { data } = await api.get(`/posts/${postId}/likers/followed/avatars/`)
    avatarSrc.value = data
  } catch (err) {
    console.error(err)
  }
})
</script>

<style scope lang="scss">
.avatar-stack {
  display: inline-flex;
  flex-direction: row-reverse;

  img {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #fff; /* optional border */
    margin-left: -8px; /* adjust overlap */
    background: #eee;
    &:last-child {
      margin-left: 0;
    }
  }
}
</style>
