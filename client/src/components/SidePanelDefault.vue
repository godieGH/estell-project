<template>
  <div class="q-pa-md">
    <!-- Article Title -->
    <q-skeleton type="text" class="text-h3 q-mb-sm" width="80%" />

    <!-- Subtitle -->
    <q-skeleton type="text" class="text-subtitle1 q-mb-md" width="60%" />

    <!-- Meta Info (Author, Date) -->
    <div class="row items-center q-gutter-sm q-mb-lg">
      <q-skeleton type="QAvatar" size="32px" />
      <q-skeleton type="text" width="100px" />
      <q-skeleton type="text" width="70px" />
    </div>

    <!-- Hero Image / Banner -->
    <q-skeleton height="200px" class="q-mb-lg" square />

    <!-- Body Content -->
    <div v-for="n in 4" :key="n" class="q-mb-md">
      <q-skeleton type="text" width="95%" />
      <q-skeleton type="text" width="90%" />
      <q-skeleton type="text" width="97%" />
    </div>

    <!-- Quote or Callout -->
    <q-skeleton height="80px" width="100%" class="q-mb-lg" />

    <!-- Second Section -->
    <div v-for="n in 3" :key="n + 100" class="q-mb-md">
      <q-skeleton type="text" width="85%" />
      <q-skeleton type="text" width="93%" />
    </div>

    <!-- Related Posts or Sidebar -->
    <div class="q-mt-xl">
      <q-skeleton type="rect" height="40px" width="40%" class="q-mb-md" />
      <div v-for="n in 3" :key="n + 200" class="q-mb-sm">
        <q-skeleton type="text" width="60%" />
      </div>
    </div>
  </div>
</template>

<script setup>
// No logic here — it's a static skeleton component for loading state
</script>
