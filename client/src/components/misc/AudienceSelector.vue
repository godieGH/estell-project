<template>
  <div class="q-pa-md">
    <q-btn
      :disabled="disable"
      flat
      :label="displayLabel"
      class="no-margin no-padding"
      icon-right="keyboard_arrow_down"
      no-caps
    >
      <q-menu>
        <q-list style="min-width: 150px">
          <q-item
            v-for="option in audienceOptions"
            :key="option.value"
            clickable
            v-close-popup
            @click="selectAudience(option.value)"
          >
            <q-item-section avatar v-if="option.icon">
              <q-icon :name="option.icon" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ option.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Define props. For v-model, the default prop name is 'modelValue'.
const props = defineProps({
  modelValue: {
    type: String,
    default: 'public',
  },
  disable: Boolean,
})

// Define emits. For v-model, the default event name is 'update:modelValue'.
const emit = defineEmits(['update:modelValue'])

const audienceOptions = [
  { icon: 'public', label: 'Public', value: 'public' },
  { icon: 'people', label: 'Friends', value: 'friends' },
  // Added relevant icons for Unlisted and Custom
  { icon: 'link', label: 'Unlisted', value: 'unlisted' },
  { icon: 'visibility_off', label: 'Only Me', value: 'private' },
]

const selectAudience = (value) => {
  // Emit the update:modelValue event with the new value
  emit('update:modelValue', value)
}

// Computed property to display the 'label' instead of the 'value'
const displayLabel = computed(() => {
  const selected = audienceOptions.find((option) => option.value === props.modelValue)
  return selected ? selected.label : 'Public' // Changed default display
})
</script>

<style scoped>
/* No specific scoped styles needed anymore for text-transform */
</style>
