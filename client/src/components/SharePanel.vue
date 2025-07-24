<template>
  <q-card style="width: 100%; max-width: 1020px; border-radius: 16px">
    <q-card-section class="q-pt-md q-pb-none row items-center no-wrap">
      <q-avatar size="56px" class="q-mr-md">
        <img :src="getAvatarSrc(post.user.avatar)" alt="User Avatar" />
      </q-avatar>
      <div class="column">
        <div class="text-subtitle1 text-weight-bold">@{{ post.user.username }}</div>
        <div class="text-caption text-grey-7">Sharing {{ post.type || 'post' }}</div>
      </div>
      <q-space />
      <q-btn v-if="$q.screen.width < 1000" icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-separator class="q-my-md" />

    <q-card-section class="q-py-sm">
      <q-scroll-area horizontal style="height: 100px; width: 100%">
        <div class="row no-wrap q-gutter-md q-px-sm items-center">
          <div class="column items-center share-action-item">
            <q-btn
              round
              color="grey-3"
              text-color="black"
              size="lg"
              icon="content_copy"
              @click="copyLink"
            />
            <div class="q-mt-xs text-caption text-center">Copy Link</div>
          </div>

          <div class="column items-center share-action-item">
            <q-btn round color="grey-3" text-color="black" size="lg" @click="shareWhatsAppMessage">
              <q-icon name="fab fa-whatsapp" size="28px" />
            </q-btn>
            <div class="q-mt-xs text-caption text-center">WhatsApp</div>
          </div>

          <div class="column items-center share-action-item">
            <q-btn round color="grey-3" text-color="black" size="lg" @click="shareWhatsAppStatus">
              <q-icon name="fab fa-whatsapp" size="28px" />
            </q-btn>
            <div class="q-mt-xs text-caption text-center">Status</div>
          </div>

          <div class="column items-center share-action-item">
            <q-btn round color="grey-3" text-color="black" size="lg" @click="shareInstagram">
              <q-icon name="fab fa-instagram" size="28px" />
            </q-btn>
            <div class="q-mt-xs text-caption text-center">Instagram</div>
          </div>

          <div class="column items-center share-action-item">
            <q-btn round color="grey-3" text-color="black" size="lg" @click="shareXTwitter">
              <q-icon name="fab fa-x-twitter" size="28px" />
            </q-btn>
            <div class="q-mt-xs text-caption text-center">X (Twitter)</div>
          </div>

          <div class="column items-center share-action-item">
            <q-btn
              round
              color="grey-3"
              text-color="black"
              size="lg"
              icon="more_horiz"
              @click="shareMore"
            />
            <div class="q-mt-xs text-caption text-center">More</div>
          </div>
        </div>
      </q-scroll-area>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { getAvatarSrc } from '../composables/formater'
import { useQuasar } from 'quasar'
//import { api } from 'boot/axios'
import { EventBus } from 'boot/event-bus'

const props = defineProps({
  post: Object,
})

//console.log(props.post)

const $q = useQuasar()

// Dummy shareable content for demonstration
const shareUrl = `${process.env.VITE_API_BASE_URL}/post/${props.post.id}` // Or your specific post URL
const shareText = `Check out this ${props.post.type + ' post' || 'post'} by @${props.post.user.username}: ${shareUrl}`

const recordShare = async (shareType) => {
  const { api } = await import('boot/axios')
  try {
    await api.post(`/api/share/post/${props.post.id}/type/${shareType}/`)
    //console.log(`✅ Recorded share: ${shareType}`)

    EventBus.emit('successfullyShared', props.post.id)
  } catch (err) {
    console.error(`❌ Failed recording ${shareType}:`, err)
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl)
    $q.notify({
      message: 'Link copied to clipboard!',
      color: 'primary',
      icon: 'check_circle',
      position: 'bottom',
      timeout: 1500,
    })
    await recordShare('copy_link')
  } catch (err) {
    console.error('Failed to copy: ', err)
    $q.notify({
      message: 'Failed to copy link.',
      color: 'negative',
      icon: 'error',
      position: 'bottom',
      timeout: 1500,
    })
  }
}

const shareWhatsAppMessage = async () => {
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  window.open(whatsappUrl, '_blank')
  await recordShare('whatsapp_message')
}

const shareWhatsAppStatus = async () => {
  // Direct WhatsApp status sharing is not straightforward via URL.
  // This will open WhatsApp with the text pre-filled, user has to manually select "My status".
  const whatsappStatusUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  window.open(whatsappStatusUrl, '_blank')
  await recordShare('whatsapp_status')
  $q.notify({
    message: 'Open WhatsApp and select "My status" to share.',
    color: 'info',
    icon: 'info',
    position: 'bottom',
    timeout: 2500,
  })
}

const shareInstagram = async () => {
  // Instagram's web sharing is limited. This will just open the Instagram website.
  // For more advanced sharing (e.g., to story), you'd typically need to use their API
  // or a server-side solution, which is beyond a simple frontend component.
  window.open('https://www.instagram.com/', '_blank')
  await recordShare('instagram')
  $q.notify({
    message: 'For Instagram, you might need to manually share the link within the app.',
    color: 'info',
    icon: 'info',
    position: 'bottom',
    timeout: 3000,
  })
}

const shareXTwitter = async () => {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
  window.open(twitterUrl, '_blank')
  await recordShare('twitter')
}

const shareMore = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: props.post.username,
        text: shareText,
        url: shareUrl,
      })
      await recordShare('web_share')
      console.log('Content shared successfully')
    } catch (error) {
      console.error('Error sharing:', error)
      $q.notify({
        message: 'Share action cancelled or failed.',
        color: 'warning',
        icon: 'warning',
        position: 'bottom',
        timeout: 1500,
      })
    }
  } else {
    $q.notify({
      message: 'Your browser does not support the Web Share API.',
      color: 'negative',
      icon: 'error',
      position: 'bottom',
      timeout: 2500,
    })
  }
}
</script>

<style lang="scss" scoped>
.share-action-item {
  min-width: 80px; /* Ensure consistent spacing for each share action */
  text-align: center;
}

.q-btn.q-btn--round {
  // Custom styling for the circular share buttons to match Instagram's look
  border: 1px solid rgba(0, 0, 0, 0.08); // Subtle border
  box-shadow: none; // Remove default Quasar shadow
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05) !important;
  }
}
</style>
