<script setup>
import { ref, onMounted } from 'vue'
import { format } from 'date-fns'
import { useAPIStore } from '@/stores/api'
import { ArrowUpDown, Loader2 } from 'lucide-vue-next'

const apiStore = useAPIStore()

const transactions = ref([])
const loading = ref(false)

// Filters & Sorting
const selectedType = ref('')

// Fetch transactions
const fetchData = async (resetPagination = false) => {
    loading.value = true

    apiStore.transactionQueryParameters.filters.type = selectedType.value

    const response = await apiStore.getUserTransaction(resetPagination)
    transactions.value = response.data.data ?? []

    loading.value = false
}
const handleFiltersChange = async () => {
    await fetchData(true)
}

// click sort column
const toggleSort = (field) => {
  const qp = apiStore.transactionQueryParameters

  if (qp.filters.sort_by === field) {
    qp.filters.sort_direction =
      qp.filters.sort_direction === 'asc' ? 'desc' : 'asc'
  } else {
    qp.filters.sort_by = field
    qp.filters.sort_direction = 'desc'
  }

  fetchData()
}

const formatDate = (date) => {
    if (!date) return ''
    return format(new Date(date), 'PPp')
}

onMounted(async () => {
    await fetchData()
})
</script>

<template>
    <div class="p-4">
        <h2 class="text-xl font-semibold mb-4">Transactions</h2>

        <!-- Filters -->
        <div class="flex gap-4 mb-4">
            <select v-model="selectedType" @change="handleFiltersChange" class="border p-2 rounded">
                <option value="">All Types</option>
                <option value="1">Bonus</option>
                <option value="2">Coin purchase</option>
                <option value="5">Game Payout</option>
            </select>
        </div>

        <!-- Table -->
        <div class="border rounded">
            <table class="w-full border-collapse">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-2 border cursor-pointer" @click="toggleSort('id')">
                            ID
                            <ArrowUpDown class="inline w-4 h-4" />
                        </th>

                        <th class="p-2 border cursor-pointer" @click="toggleSort('coins')">
                            Amount
                            <ArrowUpDown class="inline w-4 h-4" />
                        </th>

                        <th class="p-2 border">Type</th>

                        <th class="p-2 border cursor-pointer" @click="toggleSort('transaction_datetime')">
                            Created
                            <ArrowUpDown class="inline w-4 h-4" />
                        </th>
                    </tr>
                </thead>

                <tbody class="text-center align-middle">
                    <tr v-for="t in transactions" :key="t.id">
                        <td class="border p-2">{{ t.id }}</td>
                        <td class="border p-2">{{ t.coins }} coins</td>
                        <td class="border p-2">{{ t.type?.name || 'N/A' }}</td>
                        <td class="border p-2">{{ formatDate(t.transaction_datetime) }}</td>
                    </tr>
                </tbody>

            </table>

            <!-- Loading -->
            <div v-if="loading" class="flex justify-center p-4">
                <Loader2 class="animate-spin w-6 h-6" />
            </div>
        </div>
    </div>
</template>
