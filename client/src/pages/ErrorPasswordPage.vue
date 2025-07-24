<template>
  <q-page-container>
    <q-page class="row items-center justify-center bg-grey-1">
      <q-card flat bordered class="q-pa-lg q-mx-md">
        <div class="column items-center text-center">
          <!-- Big warning icon up top -->
          <q-icon name="warning" color="negative" size="64px" />

          <!-- Display status code + title -->
          <div class="text-h5 text-negative q-mt-md">Oops – {{ status }} {{ errorTitle }}</div>

          <!-- Smaller subtitle for the message -->
          <div class="text-subtitle1 text-grey-7 q-mt-sm">
            {{ errorMsg }}
          </div>
        </div>
      </q-card>
    </q-page>
  </q-page-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Grab the "status" param (always a string)
const route = useRoute()
const status = route.params.status

// Compute title based on status code
const errorTitle = computed(() => {
  if (status === '404') {
    return 'Not Found'
  }
  if (status === '429') {
    return 'Too Many Requests'
  }
  if (status === '500') {
    return 'Internal Server Error'
  }
  if (status === '401') {
    return 'Invalid or Expired Token'
  }
  // Fallback
  return 'Error'
})

// Compute message based on status code
const errorMsg = computed(() => {
  if (status === '404') {
    return 'The page you requested is not available.'
  }
  if (status === '429') {
    return 'Too many requests — please try again later.'
  }
  if (status === '500') {
    return 'It seems the server is not responding. Please try again later.'
  }
  if (status === '401') {
    return 'The token is invalid or expired. You are not allowed to perform this request.'
  }
  // Fallback
  return 'An unexpected error occurred.'
})
</script>
