<template>
  <div class="no-item-placeholder text-center flex flex-center column text-grey">
    <!-- Use a valid exclamation icon -->
    <!-- Example: Font Awesome solid exclamation-circle -->
    <q-icon name="fas fa-exclamation-triangle" size="100px" class="no-item-icon" />

    <!-- Or use Material icon "error_outline" -->
    <!-- <q-icon name="error_outline" size="120px" class="no-item-icon" /> -->

    <h5 class="no-item-title">No Items Found</h5>

    <q-btn
      dense
      flat
      :loading="loading"
      color="grey"
      icon="refresh"
      size="xl"
      class="no-item-btn"
      @click="onReload"
      aria-label="Refresh"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['reload'])
const loading = ref(false)

function onReload() {
  loading.value = true
  setTimeout(function () {
    emit('reload')
    loading.value = false
  }, 1500)
}
</script>

<style scoped>
.no-item-placeholder {
  height: 100%;
}

.no-item-icon {
  opacity: 0.5;
  margin-bottom: 20px;
}

.no-item-title {
  margin: 0;
  font-weight: 500;
}

.no-item-btn {
  min-width: 0;
}
</style>
