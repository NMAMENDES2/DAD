<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const apiStore = useAPIStore()
const games = ref([])
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const r = await apiStore.getMyGames()
    games.value = r.data.data
  } catch (e) {
    error.value = 'Failed to load your games'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="max-w-5xl mx-auto mt-10">
    <h1 class="text-2xl font-bold mb-4">My games</h1>

    <p v-if="error" class="text-red-500">{{ error }}</p>
    <p v-else-if="loading">Loading…</p>

    <table v-else class="w-full border-collapse">
      <thead>
        <tr class="border-b">
          <th class="text-left p-2">Date</th>
          <th class="text-left p-2">Type</th>
          <th class="text-left p-2">Result</th>
          <th class="text-left p-2">Points</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="g in games"
          :key="g.id"
          class="border-b hover:bg-gray-50"
        >
          <td class="p-2">{{ g.began_at }}</td>
          <td class="p-2">
            Bisca de {{ g.type === '3' ? '3' : '9' }}
          </td>
          <td class="p-2">
            <span v-if="g.winner_user_id === g.player1_user_id">Win</span>
            <span v-else-if="g.loser_user_id === g.player1_user_id">Loss</span>
            <span v-else>Draw/Interrupted</span>
          </td>
          <td class="p-2">
            {{ g.player1_points }} - {{ g.player2_points }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
