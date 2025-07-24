<template>
  <q-page class="flex flex-center" style="overflow: visible">
    <q-card
      class="q-pa-lg shadow-4 rounded-borders"
      style="width: 350px; max-width: 90vw; overflow: visible; padding-bottom: 2rem"
    >
      <div class="text-h6 text-center q-mb-md">Change Password</div>

      <!-- Form wrapper with ref -->
      <q-form ref="formRef" @submit.prevent="handleSubmit" class="q-gutter-md">
        <!-- New Password -->
        <q-input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          label="New Password"
          outlined
          bottom-slots
          :rules="passwordRules"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <!-- Confirm Password -->
        <q-input
          v-model="confirmPassword"
          :type="showConfirm ? 'text' : 'password'"
          label="Confirm Password"
          outlined
          bottom-slots
          :rules="confirmRules"
        >
          <template #append>
            <q-icon
              :name="showConfirm ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showConfirm = !showConfirm"
            />
          </template>
        </q-input>

        <!-- Submit -->
        <q-btn
          label="Submit"
          type="submit"
          color="primary"
          unelevated
          :loading="loading"
          :disable="!formIsValid"
        />
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

// Quasar plugin
const $q = useQuasar()
// Grab token from route params
const route = useRoute()
const router = useRouter()
const token = route.params.token || ''

// Form state
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const formRef = ref(null)
const formIsValid = ref(false)

// Validation rules
const passwordRules = [
  (val) => !!val || 'Password is required',
  (val) => val.length >= 8 || 'At least 8 characters',
  (val) => val.trim() === val || 'Cannot start or end with a space',
  (val) => /^[\x20-\x7E]+$/.test(val) || 'ASCII letters, numbers & symbols only',
  (val) => /[0-9]/.test(val) || 'Must include a digit',
  (val) => /[a-z]/.test(val) || 'Must include a lowercase letter',
  (val) => /[A-Z]/.test(val) || 'Must include an uppercase letter',
]

const confirmRules = [
  (val) => !!val || 'Confirmation is required',
  ...passwordRules,
  (val) => val === password.value || 'Passwords do not match',
]

async function checkFormValidity() {
  if (!formRef.value) {
    formIsValid.value = false
    return
  }

  const valid = await formRef.value.validate()
  formIsValid.value = valid
}

// Submit handler
async function handleSubmit() {
  // prevent double-submit
  if (!formIsValid.value) return
  loading.value = true

  try {
    const payload = {
      token,
      newPassword: password.value,
    }
    const { data } = await api.post('/users/reset/password', payload)

    if (data) {
      $q.notify({
        type: 'positive',
        message: data.msg || 'Password changed successfully',
      })
    }

    // Clear form & optionally redirect to login
    password.value = ''
    confirmPassword.value = ''
    router.replace({ name: 'login' })
  } catch (err) {
    console.error('Reset error', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.msg || 'Failed to reset password',
    })
  } finally {
    loading.value = false
  }
}

watch([password, confirmPassword], checkFormValidity, { immediate: true })
</script>

<style scoped>
.rounded-borders {
  border-radius: 16px;
}
</style>
