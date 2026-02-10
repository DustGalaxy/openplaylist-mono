<template>
  <div>
    <Header />

    <main class="max-w-7xl mx-auto p-4">
      <section class="py-12 text-center">
        <h1 class="text-3xl font-bold">Welcome to OpenPlaylist</h1>
        <p class="mt-2 text-gray-600">Create and share playlists with real-time updates.</p>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 border rounded">Playlist card 1</div>
        <div class="p-4 border rounded">Playlist card 2</div>
        <div class="p-4 border rounded">Playlist card 3</div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import Header from '@/03_widgets/Header'
</script>

<style scoped>
/* Add page-specific styles here if needed */
</style>
