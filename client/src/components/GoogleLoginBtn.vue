<template>
  <div class="text-center">
    <q-btn
      flat
      class="full-width"
      :loading="loading"
      spinner-size="24px"
      spinner-color="primary"
      icon="fab fa-google"
      label="Sign in with Google"
      @click="signInWithGoogle"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)

async function signInWithGoogle() {
  loading.value = true

  try {
    // ← your real Google sign-in logic here
    await fakeSignIn()
  } catch (err) {
    console.error('Sign-in failed:', err)
  } finally {
    loading.value = false
  }
}

// placeholder for demo
function fakeSignIn() {
  return new Promise((resolve) => setTimeout(resolve, 10000))
}
</script>
