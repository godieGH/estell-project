<template>
  <div
    ref="wrapper"
    class="video-wrapper"
    @click="onTap"
    v-touch-pan.horizontal.prevent.mouse="onPan"
    @contextmenu.prevent
    @mousemove="showControls"
    @touchstart="showControls"
  >
    <q-skeleton
      v-if="initialLoading"
      type="rect"
      :aspect-ratio="9 / 16"
      width="100%"
      class="skeleton-overlay"
    />
    <video
      :poster="poster"
      v-show="!initialLoading"
      ref="video"
      preload="metadata"
      :muted="mute"
      @waiting="onBuffering"
      @playing="onPlaying"
      @pause="onPaused"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @canplay="onCanPlay"
      playsinline
      webkit-playsinline
    ></video>

    <q-spinner
      v-if="loading"
      class="overlay text-white"
      size="64px"
      track-color="white"
      :thickness="4"
    />

    <q-icon
      v-if="showPlayButton && !initialLoading"
      :name="isPlaying ? 'pause_circle_filled' : 'play_circle_filled'"
      size="64px"
      class="overlay play-btn text-white"
    />

    <div v-if="seeking" class="overlay seek-timestamp">
      {{ formatTime(currentTime) }}
    </div>

    <q-icon
      v-if="showControlsOverlay && !initialLoading"
      :name="mute ? 'volume_off' : 'volume_up'"
      size="20px"
      class="overlay mute-toggle-btn text-white"
      @click.stop="toggleMute"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { EventBus } from 'boot/event-bus'
import { QSpinner, QIcon, QSkeleton } from 'quasar'
import { useSettingsStore } from 'stores/SettingsStore'
//import Hls from 'hls.js'

const props = defineProps({
  src: { type: String, required: true },
  poster: String,
})
const settingsStore = useSettingsStore()

const video = ref(null)
const wrapper = ref(null)
const isPlaying = ref(false)
const loading = ref(false) // Controls the spinner (buffering)
const showPlayButton = ref(true)
const seeking = ref(false)
const currentTime = ref(0)
const initialLoading = ref(true) // Always starts as true since src is always there and needs loading
const isIntersecting = ref(false) // Reactive variable to track intersection state
const showControlsOverlay = ref(true) // Controls visibility of mute button
let controlsTimeout = null

// New variables for double tap detection
let tapTimeout = null
let lastTapTime = 0
const DOUBLE_TAP_THRESHOLD = 300 // ms - adjust as needed

let hls = null

const autoplay = computed(() => settingsStore.autoplay)
const mute = computed({
  get: () => settingsStore.mute,
  set: (val) => {
    settingsStore.mute = val
    if (video.value) video.value.muted = val
    broadcastMuteChange(val)
  },
})

const emit = defineEmits(['ready'])

function broadcastPauseOthers() {
  EventBus.emit('pause-all')
}

// Function to play video, incorporating the pause-all broadcast
function playVideo() {
  if (video.value) {
    broadcastPauseOthers() // Pause other videos before playing this one
    video.value.play().catch((e) => {
      console.warn('Autoplay was prevented (playVideo):', e)
      // Important: Only attempt to mute and retry if the video is *not* already muted
      // and the error is due to autoplay policy (NotAllowedError or similar).
      if (e.name === 'NotAllowedError' && !video.value.muted) {
        video.value.muted = true
        // Re-check if autoplay is still desired (intersecting) before retrying with mute
        if (autoplay.value && isIntersecting.value) {
          video.value
            .play()
            .catch((e2) => console.warn('Autoplay failed even with mute (playVideo):', e2))
        }
      }
    })
  }
}

function onTap() {
  if (initialLoading.value) return
  if (seeking.value) return // If we were seeking, don't trigger tap

  const now = Date.now()
  if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
    // This is a double tap
    clearTimeout(tapTimeout) // Clear any pending single tap action
    lastTapTime = 0 // Reset last tap time
    //console.log('Double Tap Detected - no play/pause action')
    // You could add a specific double-tap action here if desired,
    // but the request is to prevent play/pause on double tap.
  } else {
    // This is potentially a single tap, set a timeout to execute play/pause
    lastTapTime = now
    clearTimeout(tapTimeout) // Ensure no old timeouts are hanging
    tapTimeout = setTimeout(() => {
      // If this code runs, it means no second tap occurred within the threshold
      isPlaying.value ? video.value.pause() : playVideo()
      lastTapTime = 0 // Reset for the next tap sequence
      showControls() // Show controls on tap
    }, DOUBLE_TAP_THRESHOLD)
  }
}

function toggleMute() {
  if (initialLoading.value) return
  mute.value = !mute.value
  showControls() // Show controls on mute toggle
}

function onBuffering() {
  loading.value = true
  showControls()
}

function onPlaying() {
  loading.value = false
  isPlaying.value = true
  showPlayButton.value = false
  initialLoading.value = false
  showControls()
}

function onPaused() {
  isPlaying.value = false
  showPlayButton.value = true
  showControls()
}

function onEnded() {
  isPlaying.value = false
  showPlayButton.value = true
  showControls()
  // Optional: loop video or play next
}

function onTimeUpdate() {
  if (video.value) {
    currentTime.value = video.value.currentTime
  }
}

let initialSeekTime = ref(0)

function onCanPlay() {
  // This signals that enough media is loaded to begin playback
  if (video.value) {
    initialLoading.value = false // Hide skeleton
    emit('ready')

    // If autoplay is enabled AND we are currently intersecting, attempt to play.
    // This handles the initial load for videos already in view.
    // The IntersectionObserver will handle subsequent plays as it enters view.
    if (autoplay.value && isIntersecting.value && !isPlaying.value) {
      playVideo()
    }
    showControls() // Show controls when video can play
  }
}

function onPan({ direction, isFirst, isFinal, offset }) {
  if (initialLoading.value) return

  if (direction !== 'left' && direction !== 'right') {
    return
  }

  showControls() // Show controls on pan interaction

  if (isFirst) {
    seeking.value = true
    if (isPlaying.value) {
      video.value.pause()
    }
    // Store the initial current time when seeking starts
    initialSeekTime.value = video.value.currentTime
  }

  const seekSensitivity = 10
  const seekDelta = offset.x / seekSensitivity

  let newTime = initialSeekTime.value + seekDelta

  if (video.value.duration) {
    newTime = Math.max(0, Math.min(video.value.duration, newTime))
  } else {
    newTime = Math.max(0, newTime)
  }

  video.value.currentTime = newTime
  currentTime.value = newTime

  if (isFinal) {
    seeking.value = false
    // If it was playing before seeking, resume play after seeking
    // Unless autoplay is off and it was paused before seeking
    if (!showPlayButton.value && autoplay.value && isIntersecting.value) {
      playVideo()
    } else if (!showPlayButton.value && !autoplay.value) {
      // If autoplay is off but it was playing, resume after seek
      playVideo()
    }
  }
}

function onPauseAll() {
  if (video.value && isPlaying.value) {
    video.value.pause()
  }
}

function onGlobalMuteChange(newMute) {
  mute.value = newMute
}

function broadcastMuteChange(newMuteState) {
  EventBus.emit('mute-change', newMuteState)
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

async function loadHlsVideo() {
  initialLoading.value = true
  if (hls) {
    hls.destroy()
    hls = null
  }

  // Dynamically import Hls.js here
  let HlsModule
  try {
    HlsModule = await import('hls.js')
  } catch (error) {
    console.error('Failed to load hls.js:', error)
    initialLoading.value = false
    // Handle gracefully, perhaps show an error message to the user
    return // Stop execution if hls.js can't be loaded
  }

  const Hls = HlsModule.default // Get the default export

  if (video.value && Hls.isSupported()) {
    hls = new Hls()
    hls.loadSource(props.src)
    hls.attachMedia(video.value)

    // Use a single listener for readiness, HLS will typically fire MANIFEST_PARSED early.
    hls.once(Hls.Events.MANIFEST_PARSED, onCanPlay)

    hls.on(Hls.Events.ERROR, function (event, data) {
      if (data.fatal) {
        console.error('HLS fatal error encountered:', data)
        initialLoading.value = false
        hls.destroy()
      } else {
        //console.warn('HLS non-fatal error:', data)
      }
    })
    video.value.muted = mute.value
  } else if (video.value && video.value.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS playback for Safari/iOS
    video.value.src = props.src
    video.value.addEventListener('loadedmetadata', onCanPlay, { once: true })
    video.value.muted = mute.value
  } else {
    console.error('This browser does not support HLS or native HLS playback. Consider a fallback.')
    initialLoading.value = false
  }
}

// Function to show controls and hide them after a delay
function showControls() {
  showControlsOverlay.value = true
  clearTimeout(controlsTimeout)
  controlsTimeout = setTimeout(() => {
    showControlsOverlay.value = false
  }, 3000) // Hide after 3 seconds of inactivity
}

let observer
onMounted(() => {
  loadHlsVideo() // Initial load of the video

  EventBus.on('pause-all', onPauseAll)
  EventBus.on('mute-change', onGlobalMuteChange)

  observer = new IntersectionObserver(
    ([entry]) => {
      isIntersecting.value = entry.isIntersecting // Update intersection state

      if (entry.isIntersecting) {
        // Only attempt to play if autoplay is enabled, not already playing,
        // AND the video is no longer in its initial loading state.
        // `onCanPlay` handles the initial play for videos that start in view.
        if (autoplay.value && !isPlaying.value && !initialLoading.value) {
          playVideo()
        }
      } else {
        // When video leaves viewport, always pause it
        if (isPlaying.value) {
          video.value.pause()
        }
      }
    },
    { threshold: 0.7 },
  )
  wrapper.value && observer.observe(wrapper.value)

  // Initially show controls for a bit when mounted
  showControls()
})

watch(
  () => props.src,
  (newSrc, oldSrc) => {
    if (newSrc !== oldSrc) {
      console.log(`Video source changed from ${oldSrc} to ${newSrc}. Reloading HLS.`)
      // When source changes, re-initialize, which will trigger loadHlsVideo()
      // and effectively reset initialLoading to true.
      loadHlsVideo()
    }
  },
)

onBeforeUnmount(() => {
  EventBus.off('pause-all', onPauseAll)
  EventBus.off('mute-change', onGlobalMuteChange)
  if (wrapper.value && observer) {
    observer.unobserve(wrapper.value)
  }
  clearTimeout(controlsTimeout) // Clear any pending timeout
  clearTimeout(tapTimeout) // Clear any pending tap timeout

  if (hls) {
    hls.destroy()
    hls = null
  }
  // Explicitly pause video on unmount to prevent lingering audio/video processes
  if (video.value) {
    video.value.pause()
    video.value.src = '' // Clear source
    video.value.load() // Load empty to free resources
  }
})
</script>

<style scoped>
/* Your existing styles remain */
.video-wrapper {
  position: relative;
  width: 100%;
  /* Added for touch-scrolling prevention, if needed */
  /* touch-action: pan-y; */
}

video {
  width: 100%;
  border-radius: 8px;
  display: block;
  background: black; /* Good for HLS to prevent flashes */
}

.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.skeleton-overlay {
  position: absolute;
  width: 100%;
  padding-top: 56.25%; /* maintain 16:9 ratio */
  background: #eee;
  border-radius: 8px;
}

.play-btn {
  cursor: pointer;
}
.seek-timestamp {
  background: rgba(0, 0, 0, 0.6);
  padding: 0.5em 1em;
  border-radius: 4px;
  font-size: 1.2em;
  color: white;
}

/* New style for the mute toggle button */
.mute-toggle-btn {
  bottom: 10px; /* Adjust as needed */
  right: 10px; /* Adjust as needed */
  top: auto;
  left: auto;
  transform: none; /* Remove translation from generic overlay */
  cursor: pointer;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  padding: 4px;
  transition: opacity 0.3s ease-in-out;
}
</style>
