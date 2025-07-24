<template>
  <q-page class="flex flex-center bg-gradient">
    <q-card class="q-pa-lg shadow-2" style="width: 400px; max-width: 85vw; border-radius: 10px">
      <q-card-section>
        <div class="text-h5 text-center text-primary">Welcome Back</div>
      </q-card-section>

      <q-form @submit="submitForm" ref="loginForm" class="q-gutter-md">
        <q-input
          v-model="credentials.email"
          label="Email"
          type="email"
          :rules="[
            (val) => !!val || 'Email is required',
            (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
          ]"
        />

        <q-input
          v-model="credentials.password"
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

        <div class="have-an-acc-link-linkto">
          <router-link flat to="/auth/forgot-password" :class="routerLinkColor"
            >Forgot Password?</router-link
          >
        </div>

        <div class="row justify-between items-center q-mt-md">
          <q-btn
            label="Login"
            type="submit"
            :color="btnColor"
            :loading="loading"
            spinner-size="24px"
            spinner-color="primary"
          />
          <q-btn flat label="Create an account" @click="goToRegister" />
        </div>
      </q-form>

      <div class="row items-center q-my-md">
        <q-separator class="col" />
        <span class="text-caption text-grey-6 q-mx-sm">OR</span>
        <q-separator class="col" />
      </div>

      <GoogleLoginBtn style="width: 100%" />
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
          <q-btn flat label="Ok" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { useUserStore } from 'stores/user'
import GoogleLoginBtn from 'components/GoogleLoginBtn.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'

const userStore = useUserStore()
const router = useRouter()
const loginForm = ref(null)
const loading = ref(false)
const btnColor = ref('primary')

const credentials = ref({
  email: '',
  password: '',
})

const msg = ref({
  head: '',
  body: '',
})

const dialog = ref(false)

const submitForm = async () => {
  const valid = await loginForm.value.validate()
  if (valid) {
    loading.value = true
    btnColor.value = 'secondary'

    try {
      const res = await api.post(`/users/login`, credentials.value)
      userStore.setUser(res.data.user, res.data.accessToken)
      if (userStore.isLoggedIn) {
        window.location.href = '/'
      }
    } catch (err) {
      if (err.status === 401) {
        dialog.value = true
        msg.value = {
          head: 'Invalid Credentials',
          body: 'Invalid email or password. Please double-check and try again.',
        }
      } else if (err.status === 429) {
        dialog.value = true
        msg.value = {
          head: `Request failed Error: ${err.status}`,
          body: 'Too many login attempts, please try again later.',
        }
      } else if (err.status === 422) {
        dialog.value = true
        msg.value = {
          head: `Error: ${err.status}`,
          body: 'Invalid Inputs. Please Make sure the email and password are in required format.',
        }
      } else if (err.status === 403) {
        dialog.value = true
        msg.value = {
          head: `Email Not Verified`,
          body: 'Please check you emails and verify to continue.',
        }
      } else {
        msg.value.head = `Error: ${err.status}`
        msg.value.body = 'Please Try Again later. Server not responding.'
        dialog.value = true
      }
    } finally {
      loading.value = false
      btnColor.value = 'primary'
    }
  }
}

const goToRegister = () => {
  router.push('/auth/register')
}

const showPassword = ref(false)

function onLockClicked() {
  showPassword.value = !showPassword.value
}

onMounted(() => {
  //console.log(userStore.user)
  //console.log(userStore.token)
})
</script>

<style scoped lang="scss">
.have-an-acc-link-linkto {
  margin: 0;
  padding: 0 15px;
  width: 100%;
  a {
    color: $primary;
    font-size: 14px;
  }
}
</style>
