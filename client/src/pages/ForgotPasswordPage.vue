<template>
  <div class="q-pa-md flex flex-center">
    <q-card class="my-card q-pa-lg" flat bordered>
      <q-form @submit.prevent="onSubmit" class="column items-stretch">
        <div class="text-h5 text-center q-mb-md">Forgot Password</div>
        <div class="text-subtitle2 text-center q-mb-lg">
          Enter your email address and we'll send you a link to reset your password.
        </div>
        <q-input
          v-model="email"
          label="Email"
          type="email"
          outlined
          dense
          :rules="[
            (val) => !!val || 'Email is required',
            (val) => isValidEmail(val) || 'Invalid email',
          ]"
          class="q-mb-md"
        >
          <template v-slot:prepend>
            <q-icon name="email" />
          </template>
        </q-input>
        <q-btn
          type="submit"
          color="primary"
          unelevated
          class="full-width"
          :disable="!formValid"
          :loading="loading"
          label="Send Reset Link"
        />
        <q-space />
        <div class="text-caption text-center q-mt-md">
          <router-link flat to="/auth/login" class="text-primary">Back to Login</router-link>
        </div>
      </q-form>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const email = ref('')
const loading = ref(false)
const $q = useQuasar()

// Simplified regex to satisfy ESLint (no unnecessary escapes)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isValidEmail = (val) => {
  return emailRegex.test(val)
}

const formValid = computed(() => {
  return email.value && isValidEmail(email.value)
})

const notify = (type, message) => {
  $q.notify({ type, message })
}

const onSubmit = async () => {
  if (!email.value) {
    notify('negative', 'Email is required')
    return
  }

  loading.value = true

  try {
    const { data } = await api.post('/users/forgot/password', {
      email: email.value,
    })
    //console.log('API response:', data)
    notify('positive', `${data.message}`)
  } catch (err) {
    switch (err.status) {
      case 500:
        notify('negative', `Failed to initiate password reset. Try Again later.`)
        break
      case 429:
        notify('negative', `Too many password reset requests, please try again later.`)
        break
      default:
        // Optional: Add a default notification for other error statuses
        notify('negative', `An unexpected error occurred. Please try again.`)
        break
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.my-card {
  max-width: 400px;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
