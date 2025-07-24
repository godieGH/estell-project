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
      <q-menu class="full-screen-menu">
        <q-list style="min-width: 150px">
          <q-item
            v-for="option in categories"
            :key="option.value"
            clickable
            v-close-popup
            @click="selectOption(option.value)"
          >
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

const props = defineProps({
  modelValue: {
    type: [String, Number], // Allow string or number for value
    default: null, // Default to null or a sensible initial value
  },
  disable: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const selectOption = (value) => {
  emit('update:modelValue', value)
}

// Array of suggested categories (now directly used as options)
const categories = [
  { label: 'Technology', value: 'technology' },
  { label: 'Science', value: 'science' },
  { label: 'Health & Wellness', value: 'health-wellness' },
  { label: 'Food & Cooking', value: 'food-cooking' },
  { label: 'Travel', value: 'travel' },
  { label: 'Fashion & Beauty', value: 'fashion-beauty' },
  { label: 'Sports', value: 'sports' },
  { label: 'Arts & Culture', value: 'arts-culture' },
  { label: 'Education', value: 'education' },
  { label: 'Business & Finance', value: 'business-finance' },
  { label: 'Personal Development', value: 'personal-development' },
  { label: 'Home & Garden', value: 'home-garden' },
  { label: 'DIY & Crafts', value: 'diy-crafts' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Movies & TV', value: 'movies-tv' },
  { label: 'Music', value: 'music' },
  { label: 'Books & Literature', value: 'books-literature' },
  { label: 'Photography', value: 'photography' },
  { label: 'Animals & Pets', value: 'animals-pets' },
  { label: 'Environment', value: 'environment' },
  { label: 'Politics & Current Events', value: 'politics-current-events' },
  { label: 'Parenting', value: 'parenting' },
  { label: 'Relationships', value: 'relationships' },
  { label: 'Humor', value: 'humor' },
  { label: 'News', value: 'news' },
  { label: 'Lifestyle', value: 'lifestyle' },
  { label: 'Spirituality', value: 'spirituality' },
  { label: 'History', value: 'history' },
  { label: 'Architecture & Design', value: 'architecture-design' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Mental Health', value: 'mental-health' },
  { label: 'Programming & Web Dev', value: 'programming-web-dev' },
  { label: 'Career', value: 'career' },
  { label: 'Volunteering & Charity', value: 'volunteering-charity' },
]

// Computed property to display the 'label' instead of the 'value'
const displayLabel = computed(() => {
  const selectedOption = categories.find((option) => option.value === props.modelValue)
  return selectedOption ? selectedOption.label : 'Select Category' // Changed default display
})
</script>

<style>
/* Global styles for the full-screen menu */
.q-menu.full-screen-menu {
}

.q-menu.full-screen-menu .q-list {
  height: 100%; /* Make the list take full height of the menu */
  overflow-y: auto; /* Enable scrolling if content overflows */
}
</style>
