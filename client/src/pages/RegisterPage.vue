<template>
  <q-page class="flex flex-center bg-gradient">
    <q-card class="q-pa-lg shadow-2" style="width: 400px; max-width: 85vw; border-radius: 10px">
      <q-card-section>
        <div class="text-h5 text-center text-primary">Create Account</div>
      </q-card-section>

      <q-form @submit="submitForm" ref="registerForm" class="q-gutter-md">
        <q-input
          normal
          v-model="form.name"
          label="Full Name"
          :rules="[
            (val) => !!val || 'Full name is required',
            (val) =>
              /^[A-Za-z'-]+(?:\s+[A-Za-z'-]+){0,2}$/.test(val) ||
              'Enter at least first and last name, and not more than three names (letters, hyphens, apostrophes only)',
            (val) => val.length <= 30 || 'Name cannot exceed 30 characters',
          ]"
        />

        <q-input
          v-model="form.email"
          label="Email"
          type="email"
          :rules="[
            (val) => !!val || 'Email is required',
            (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
          ]"
        />

        <q-input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          :rules="[
            // 1. Required
            (val) => !!val || 'Password is required',
            // 2. Minimum length (8)
            (val) => val.length >= 8 || 'Password must be at least 8 characters',
            // 3. No leading/trailing spaces
            (val) => val.trim() === val || 'Cannot start or end with a space',
            // 4. ASCII-only printable characters
            (val) =>
              /^[\x20-\x7E]+$/.test(val) ||
              'Password can only contain ASCII letters, numbers & symbols',
            // 5. Composition: at least one digit
            (val) => /[0-9]/.test(val) || 'Must include at least one digit',
            // 6. Composition: at least one lowercase letter
            (val) => /[a-z]/.test(val) || 'Must include at least one lowercase letter',
            // 7. Composition: at least one uppercase letter
            (val) => /[A-Z]/.test(val) || 'Must include at least one uppercase letter',
          ]"
        >
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'lock_open' : 'lock'"
              class="cursor-pointer"
              @click="onLockClicked"
            />
          </template>
        </q-input>

        <div class="row justify-between items-center q-mt-md">
          <q-btn
            label="Register"
            style="width: 100%"
            :loading="loading"
            spinner-size="24px"
            spinner-color="primary"
            type="submit"
            :color="btnColor"
          />
        </div>
      </q-form>

      <div class="have-an-acc-link-linkto">
        <router-link flat to="/auth/login" :class="routerLinkColor"
          >Already have an account?</router-link
        >
      </div>
    </q-card>

    <q-dialog v-model="dialog" backdrop-filter="blur(4px)">
      <q-card>
        <q-card-section class="row items-center q-pb-none text-h6">
          {{ msg.head }}
        </q-card-section>

        <q-card-section>
          {{ msg.body }}
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Ok" @click="onOkClicked" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from 'boot/axios'

const router = useRouter()
const registerForm = ref(null)
const showPassword = ref(false)
const loading = ref(false)
const btnColor = ref('primary')

const form = ref({
  name: '',
  email: '',
  password: '',
})

const msg = ref({
  head: '',
  body: '',
})

const dialog = ref(false)

const regSuccess = ref(false)

const submitForm = async () => {
  const valid = await registerForm.value.validate()
  if (valid) {
    loading.value = true
    btnColor.value = 'secondary'

    try {
      const res = await api.post(`/users/register`, form.value)

      if (res.status === 201) {
        msg.value.head = 'Success'
        msg.value.body =
          'You Successfully Created An Account. Please Check Your emails for verification'
        dialog.value = true
        regSuccess.value = true
      }
    } catch (err) {
      console.log(err.status)
      if (err.status === 409) {
        msg.value.head = `Email Already taken`
        msg.value.body =
          'This email address is already registered. Please log in or use a different email.'
        dialog.value = true
      } else if (err.status === 422) {
        msg.value.head = `Invalid Inputs`
        msg.value.body = 'Invalid Inputs. Please Make sure the email and password are valid.'
        dialog.value = true
      } else {
        msg.value.head = `Error: ${err.status}`
        msg.value.body = 'Please Try Again later. Server not responding.'
        dialog.value = true
      }
    } finally {
      loading.value = false
      btnColor.value = 'primary'
    }

    // Handle registration logic here (e.g., API call)
    //console.log('Registration successful:', form.value)
  }
}

function onLockClicked() {
  showPassword.value = !showPassword.value
}

function onOkClicked() {
  if (regSuccess.value) {
    router.push('/auth/login')
  }
}
</script>

<style scoped lang="scss">
.have-an-acc-link-linkto {
  padding: 15px;
  text-align: center;
  width: 100%;
  a {
    color: $primary;
    font-size: 14px;
  }
}
</style>
