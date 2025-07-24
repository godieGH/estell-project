<template>
  {{ placeName }}
</template>
<script setup>
import { ref, watchEffect } from 'vue'

const placeName = ref('')
const props = defineProps({
  post: Object,
})

async function resolveLocation(lat, lng) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    )
    const data = await res.json()
    placeName.value = data.locality ? `${data.locality}, ${data.countryCode}` : data.countryName

    //console.log(data)
  } catch (err) {
    console.error('Geo error:', err)
  }
}

watchEffect(() => {
  const loc = props.post.location || {}
  if (loc.latitude && loc.longitude) {
    resolveLocation(loc.latitude, loc.longitude)
  }
})
</script>
