<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const api = useAPIStore()

const games = ref([])
const matches = ref([])
const loading = ref(false)
const error = ref(null)

const filters = ref({
  type: '',
  status: '',
})

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const params = {}
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.status) params.status = filters.value.status

    const [gRes, mRes] = await Promise.all([
      api.getAdminGames(params),
      api.getAdminMatches(params),
    ])

    games.value = gRes.data.data ?? gRes.data
    matches.value = mRes.data.data ?? mRes.data
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load games and matches'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold">Games & Matches</h2>
        <p class="text-sm text-gray-500">
          Read-only view of all multiplayer games and matches.
        </p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="filters.type"
          class="border rounded px-2 py-1 text-sm"
          @change="loadData"
        >
          <option value="">All types</option>
          <option value="3">Bisca de 3</option>
          <option value="9">Bisca de 9</option>
        </select>
        <select
          v-model="filters.status"
          class="border rounded px-2 py-1 text-sm"
          @change="loadData"
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Playing">Playing</option>
          <option value="Ended">Ended</option>
          <option value="Interrupted">Interrupted</option>
        </select>
      </div>
    </header>

    <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
    <p v-else-if="loading" class="text-sm text-gray-500">Loading…</p>

    <div v-else class="space-y-8">
      <!-- Games -->
      <div>
        <h3 class="text-lg font-semibold mb-2">Games</h3>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b bg-gray-50">
              <th class="p-2 text-left">ID</th>
              <th class="p-2 text-left">Type</th>
              <th class="p-2 text-left">Status</th>
              <th class="p-2 text-left">Player 1</th>
              <th class="p-2 text-left">Player 2</th>
              <th class="p-2 text-left">Winner</th>
              <th class="p-2 text-left">Began</th>
              <th class="p-2 text-left">Ended</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in games" :key="g.id" class="border-b">
              <td class="p-2">{{ g.id }}</td>
              <td class="p-2">{{ g.type }}</td>
              <td class="p-2">{{ g.status }}</td>
              <td class="p-2">{{ g.player1?.nickname ?? g.player1_id }}</td>
              <td class="p-2">{{ g.player2?.nickname ?? g.player2_id }}</td>
              <td class="p-2">{{ g.winner?.nickname ?? g.winner_user_id }}</td>
              <td class="p-2">{{ g.began_at }}</td>
              <td class="p-2">{{ g.ended_at }}</td>
            </tr>
            <tr v-if="games.length === 0">
              <td colspan="8" class="p-4 text-center text-gray-500">
                No games found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Matches -->
      <div>
        <h3 class="text-lg font-semibold mb-2">Matches</h3>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b bg-gray-50">
              <th class="p-2 text-left">ID</th>
              <th class="p-2 text-left">Type</th>
              <th class="p-2 text-left">Status</th>
              <th class="p-2 text-left">Player 1</th>
              <th class="p-2 text-left">Player 2</th>
              <th class="p-2 text-left">Winner</th>
              <th class="p-2 text-left">Stake</th>
              <th class="p-2 text-left">Began</th>
              <th class="p-2 text-left">Ended</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in matches" :key="m.id" class="border-b">
              <td class="p-2">{{ m.id }}</td>
              <td class="p-2">{{ m.type }}</td>
              <td class="p-2">{{ m.status }}</td>
              <td class="p-2">{{ m.player1?.nickname ?? m.player1_id }}</td>
              <td class="p-2">{{ m.player2?.nickname ?? m.player2_id }}</td>
              <td class="p-2">{{ m.winner?.nickname ?? m.winner_user_id }}</td>
              <td class="p-2">{{ m.stake }}</td>
              <td class="p-2">{{ m.began_at }}</td>
              <td class="p-2">{{ m.ended_at }}</td>
            </tr>
            <tr v-if="matches.length === 0">
              <td colspan="9" class="p-4 text-center text-gray-500">
                No matches found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
