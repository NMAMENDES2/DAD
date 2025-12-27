<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const apiStore = useAPIStore()
const matchesWon = ref([])
const coinsWon = ref([])
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const r = await apiStore.getLeaderboard()
    matchesWon.value = r.data.matches_won
    coinsWon.value = r.data.coins_won
  } catch (e) {
    error.value = 'Failed to load leaderboard'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="max-w-5xl mx-auto mt-10 space-y-8">
    <h1 class="text-2xl font-bold">Leaderboard</h1>

    <p v-if="error" class="text-red-500">{{ error }}</p>
    <p v-else-if="loading">Loading…</p>

    <div v-else class="grid gap-8 md:grid-cols-2">
      <!-- Top por vitórias -->
      <div>
        <h2 class="text-xl font-semibold mb-2">Top players by wins</h2>
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2">#</th>
              <th class="text-left p-2">Player</th>
              <th class="text-left p-2">Matches won</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in matchesWon"
              :key="`wins-${row.user_id}`"
              class="border-b hover:bg-gray-50"
            >
              <td class="p-2">{{ index + 1 }}</td>
              <td class="p-2">{{ row.name }}</td>
              <td class="p-2">{{ row.matches_won }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Top por coins -->
      <div>
        <h2 class="text-xl font-semibold mb-2">Top players by coins won</h2>
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2">#</th>
              <th class="text-left p-2">Player</th>
              <th class="text-left p-2">Coins</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in coinsWon"
              :key="`coins-${row.user_id}`"
              class="border-b hover:bg-gray-50"
            >
              <td class="p-2">{{ index + 1 }}</td>
              <td class="p-2">{{ row.name }}</td>
              <td class="p-2">{{ row.total_coins }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
