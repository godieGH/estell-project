<template>
  <q-drawer
    v-model="panel"
    side="right"
    :overlay="$q.screen.width < 360"
    :width="$q.screen.width < 360 ? '100%' : 360"
    content-class="text-primary flex flex-col"
  >
    <!-- Top toolbar with close -->
    <q-toolbar class="justify-end">
      <q-btn flat round dense icon="close" aria-label="Close" @click="panel = false" />
    </q-toolbar>
    <!-- Search input -->
    <div class="q-px-md q-mb-sm">
      <q-input
        v-model="query"
        placeholder="Search..."
        type="search"
        style="font-size: 12px"
        dense
        rounded
        outlined
        clearable
        @input="onSearch"
        class="shadow-sm q-px-sm"
      />
    </div>

    <!-- Filter buttons with scroll and overlay -->
    <div v-if="loading" class="row no-wrap scroll-x">
      <q-skeleton
        v-for="n in 5"
        :key="n"
        type="rect"
        width="80px"
        height="32px"
        style="border-radius: 20px"
        class="q-mx-xs"
      />
    </div>
    <div v-else style="position: relative" class="q-pa-sm">
      <!-- Left scroll-back button -->
      <q-btn
        v-if="showLeft"
        flat
        dense
        rounded
        style="
          position: absolute;
          z-index: 10;
          background-image: linear-gradient(to right, #333, #ffffff8b);
          color: white;
        "
        icon="arrow_back_ios"
        class="left-1 top-1/2 transform -translate-y-1/2 z-10"
        @click="scrollToAll"
      />
      <!-- Scroll container -->
      <div
        ref="scrollRef"
        class="row no-wrap scroll-x"
        @scroll="onScroll"
        style="overflow-x: auto; white-space: nowrap"
      >
        <q-btn
          v-for="btn in visibleFilters"
          :key="btnKey(btn)"
          flat
          rounded
          style="border: 1px solid; font-size: 12px; margin: 0 2px"
          class="filter-btn"
          :class="isActive(btn) ? 'bg-primary text-white border-transparent' : ''"
          :label="btnLabel(btn)"
          :icon="btnIcon(btn)"
          @click="handleFilterClick(btn)"
        />
      </div>
    </div>

    <!-- Suggestions -->
    <div v-if="suggestions.length" class="q-pa-sm">
      <q-list>
        <q-item v-for="(item, idx) in suggestions" :key="idx" clickable>
          <q-item-section>{{ item }}</q-item-section>
        </q-item>
      </q-list>
    </div>

    <div class="q-px-lg">
      <div class="q-py-sm row q-col-gutter-sm">
        <!-- Middle: Two stacked result boxes -->
        <div class="col-7 column q-gutter-sm">
          <q-skeleton height="100px" square />
          <q-skeleton height="80px" square />
        </div>

        <!-- Right: Long side panel -->
        <div class="col-5">
          <q-skeleton height="100%" width="100%" />
        </div>
      </div>
      <div class="q-py-sm row q-col-gutter-sm">
        <!-- Right: Long side panel -->
        <div class="col-5">
          <q-skeleton height="100%" width="100%" />
        </div>

        <!-- Middle: Two stacked result boxes -->
        <div class="col-7 column q-gutter-sm">
          <q-skeleton height="100px" square />
          <q-skeleton height="80px" square />
        </div>
      </div>
      <div class="q-py-sm row q-col-gutter-sm">
        <div class="col-12">
          <q-list separator>
            <q-item v-for="n in 2" :key="n">
              <q-item-section avatar>
                <q-skeleton type="QAvatar" />
              </q-item-section>
              <q-item-section>
                <q-skeleton type="text" width="40%" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-drawer>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const panel = ref(false)
const query = ref('')
const suggestions = ref([])
const filters = ['all', 'people', 'posts', 'business', 'location', 'tags', 'topic']
const selected = ref('all')
const scrollRef = ref(null)
const showLeft = ref(false)
const loading = ref(true)

defineExpose({
  open() {
    panel.value = true
  },
})

function onSearch(val) {
  if (val && val.length > 1) {
    suggestions.value = [`${val} suggestion 1`, `${val} suggestion 2`, `${val} suggestion 3`]
  } else {
    suggestions.value = []
  }
}

const visibleFilters = computed(() => {
  return selected.value === 'all' ? filters : ['all', selected.value]
})

function btnLabel(btn) {
  return btn === 'all' && selected.value !== 'all' ? '' : btn.charAt(0).toUpperCase() + btn.slice(1)
}

function btnIcon(btn) {
  return btn === 'all' && selected.value !== 'all' ? 'close' : undefined
}

function btnKey(btn) {
  return btn === 'all' && selected.value !== 'all' ? `close-${selected.value}` : btn
}

function isActive(btn) {
  return selected.value === btn
}

function handleFilterClick(btn) {
  if (btn === 'all' && selected.value !== 'all') {
    selected.value = 'all'
  } else if (btn !== 'all') {
    selected.value = btn
  }
  suggestions.value = []
  scrollToAll()
}

function onScroll() {
  const el = scrollRef.value
  showLeft.value = el && el.scrollLeft > 10
}

function scrollToAll() {
  const el = scrollRef.value
  if (el) el.scrollTo({ left: 0, behavior: 'smooth' })
}

onMounted(async () => {
  onScroll()

  //simulate a little fake loading on filter btn
  loading.value = await new Promise((r) => setTimeout(() => r(false), 2000))
})
</script>
<style scoped>
.scroll-x {
  /* hide default scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scroll-x::-webkit-scrollbar {
  display: none;
}

.filter-overlay {
  /* use primary color with low opacity, switches in dark mode */
  background-color: rgba(var(--q-color-primary-rgb), 0.15);
  backdrop-filter: blur(4px);
  border-radius: 50%;
}
</style>
