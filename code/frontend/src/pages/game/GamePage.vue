<template>
  <div class="flex items-center justify-center">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Welcome to the Game!</h2>
      <p class="mt-2 text-xl">You are playing <strong>{{ mode }}</strong> with <strong>{{ variant }}</strong> variant.</p>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// Get mode and variant from route params
const mode = route.params.mode
const variant = route.params.variant
</script>

<style scoped>
/* Add any custom styles if needed */
</style>
