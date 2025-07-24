<template>
  <div class="link-chips-container">
    <a
      v-for="link in links"
      :key="link.url"
      :href="link.url"
      class="link-chip"
      target="_blank"
      rel="noopener noreferrer"
    >
      <i class="material-icons" style="font-size: 1.2em; vertical-align: middle; margin-right: 5px">
        link
      </i>
      {{ link.name }}
    </a>
  </div>
</template>

<script setup>
const props = defineProps({
  post: Object,
})

const links = props.post.linkUrl

//console.log(links)
</script>

<style scoped lang="scss">
.link-chips-container {
  display: flex; /* Or grid */
  flex-wrap: wrap;
  margin-bottom: 5px;
  gap: 8px; /* Space between chips */
}

.link-chip {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px; /* Rounded corners for chip look */
  background-color: #e0e0e0; /* Light gray background */
  color: #333; /* Dark text */
  text-decoration: none; /* No underline by default */
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.link-chip:hover {
  background-color: #d0d0d0;
  color: #000;
}

.link-chip:active {
  background-color: #c0c0c0;
}
</style>
