<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const api = useAPIStore()

const transactions = ref([])
const stats = ref(null)
const loading = ref(false)
const error = ref(null)

const filters = ref({
  type: '',
})

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const params = {}
    if (filters.value.type) params.type = filters.value.type

    const [tRes, sRes] = await Promise.all([
      api.getAdminTransactions(params),
      api.getAdminGlobalStats(),
    ])

    transactions.value = tRes.data.data ?? tRes.data
    stats.value = sRes.data
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load transactions and statistics'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold">Transactions & Statistics</h2>
        <p class="text-sm text-gray-500">
          Read-only access to all coin transactions and platform usage summaries.
        </p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="filters.type"
          class="border rounded px-2 py-1 text-sm"
          @change="load"
        >
          <option value="">All types</option>
          <option value="Bonus">Bonus</option>
          <option value="Coin purchase">Coin purchase</option>
          <option value="Game fee">Game fee</option>
          <option value="Match stake">Match stake</option>
          <option value="Game payout">Game payout</option>
          <option value="Match payout">Match payout</option>
        </select>
      </div>
    </header>

    <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
    <p v-else-if="loading" class="text-sm text-gray-500">Loading…</p>

    <div v-else class="space-y-8">
      <!-- Estatísticas -->
      <div v-if="stats">
        <h3 class="text-lg font-semibold mb-2">Global statistics</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="border rounded p-3">
            <p class="text-gray-500">Total players</p>
            <p class="text-lg font-semibold">{{ stats.base?.total_players ?? stats.total_players }}</p>
          </div>
          <div class="border rounded p-3">
            <p class="text-gray-500">Total games</p>
            <p class="text-lg font-semibold">{{ stats.base?.total_games ?? stats.total_games }}</p>
          </div>
          <div class="border rounded p-3">
            <p class="text-gray-500">Total matches</p>
            <p class="text-lg font-semibold">{{ stats.base?.total_matches ?? stats.total_matches }}</p>
          </div>
          <div class="border rounded p-3">
            <p class="text-gray-500">Coins purchased</p>
            <p class="text-lg font-semibold">{{ stats.base?.total_coins_purchased ?? stats.total_coins_purchased }}</p>
          </div>
        </div>
      </div>

      <!-- Transações -->
      <div>
        <h3 class="text-lg font-semibold mb-2">Coin transactions</h3>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b bg-gray-50">
              <th class="p-2 text-left">ID</th>
              <th class="p-2 text-left">User</th>
              <th class="p-2 text-left">Type</th>
              <th class="p-2 text-left">Coins</th>
              <th class="p-2 text-left">Date</th>
              <th class="p-2 text-left">Game</th>
              <th class="p-2 text-left">Match</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transactions" :key="t.id" class="border-b">
              <td class="p-2">{{ t.id }}</td>
              <td class="p-2">
                {{ t.user?.nickname ?? t.user_id }}
              </td>
              <td class="p-2">
                {{ t.type_relation?.name ?? t.type_name }}
              </td>
              <td class="p-2">{{ t.coins }}</td>
              <td class="p-2">{{ t.transaction_datetime }}</td>
              <td class="p-2">{{ t.game_id ?? '-' }}</td>
              <td class="p-2">{{ t.match_id ?? '-' }}</td>
            </tr>
            <tr v-if="transactions.length === 0">
              <td colspan="7" class="p-4 text-center text-gray-500">
                No transactions found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
