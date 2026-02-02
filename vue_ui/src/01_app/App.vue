<script setup lang="ts">
import Button from '@/06_shared/volt/Button.vue'
</script>

<template>
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
  <Button v-tooltip="'I am a tooltip'">Click me</Button>
</template>

<style scoped></style>
