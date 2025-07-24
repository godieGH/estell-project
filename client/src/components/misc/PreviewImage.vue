<template>
  <q-img style="border-radius: 8px" width="100%" :src="getPostSrc(src)" />
</template>

<script setup>
import { getPostSrc } from 'src/composables/formater'

defineProps({
  src: String,
})
</script>
