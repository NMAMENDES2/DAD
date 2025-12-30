<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const apiStore = useAPIStore()
const matches = ref([])
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const r = await apiStore.getMyMatches()
    matches.value = r.data.data ?? r.data // paginate() devolve .data
  } catch (e) {
    error.value = 'Failed to load your matches'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="max-w-5xl mx-auto mt-10">
    <h1 class="text-2xl font-bold mb-4">My matches</h1>

    <p v-if="error" class="text-red-500">{{ error }}</p>
    <p v-else-if="loading">Loading…</p>

    <table v-else class="w-full border-collapse">
      <thead>
        <tr class="border-b">
          <th class="text-left p-2">Date</th>
          <th class="text-left p-2">Type</th>
          <th class="text-left p-2">Result</th>
          <th class="text-left p-2">Marks</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="m in matches"
          :key="m.id"
          class="border-b hover:bg-gray-50"
        >
          <td class="p-2">{{ m.began_at }}</td>
          <td class="p-2">
            Bisca de {{ m.type === '3' ? '3' : '9' }}
          </td>
          <td class="p-2">
            <span v-if="m.winner_user_id === m.player1_user_id">Win</span>
            <span v-else-if="m.loser_user_id === m.player1_user_id">Loss</span>
            <span v-else>Draw/Interrupted</span>
          </td>
          <td class="p-2">
            {{ m.player1_marks }} - {{ m.player2_marks }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
