<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const apiStore = useAPIStore()
const stats = ref(null)
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const r = await apiStore.getMyStats()
    stats.value = r.data
  } catch (e) {
    error.value = 'Failed to load your statistics'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="max-w-xl mx-auto mt-10">
    <h1 class="text-2xl font-bold mb-4">My statistics</h1>

    <p v-if="error" class="text-red-500">{{ error }}</p>
    <p v-else-if="loading">Loading…</p>

    <div v-else-if="stats" class="grid gap-4">
      <div class="p-4 bg-white shadow rounded">
        <p class="text-sm text-gray-500">Total games</p>
        <p class="text-xl font-semibold">{{ stats.total_games }}</p>
      </div>

      <div class="p-4 bg-white shadow rounded">
        <p class="text-sm text-gray-500">Total wins</p>
        <p class="text-xl font-semibold">{{ stats.total_wins }}</p>
      </div>

      <div class="p-4 bg-white shadow rounded">
        <p class="text-sm text-gray-500">Best score</p>
        <p class="text-xl font-semibold">{{ stats.best_score }}</p>
      </div>

      <div class="p-4 bg-white shadow rounded">
        <p class="text-sm text-gray-500">Current coins</p>
        <p class="text-xl font-semibold">{{ stats.total_coins }}</p>
      </div>
    </div>
  </section>
</template>
