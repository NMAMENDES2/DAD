<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'
import { Bar } from 'vue-chartjs'
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { cn } from '@/lib/utils'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const apiStore = useAPIStore()
const globalStats = ref(null)
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  try {
    const r = await apiStore.getGlobalStats()
    globalStats.value = r.data
  } catch (e) {
    error.value = 'Failed to load global statistics'
  } finally {
    loading.value = false
  }
})

const chartData = computed(() => {
  if (!globalStats.value) return null
  return {
    labels: ['Bisca de 3', 'Bisca de 9'],
    datasets: [
      {
        label: 'Games played',
        data: [
          globalStats.value.bisca3_games ?? 0,
          globalStats.value.bisca9_games ?? 0,
        ],
        backgroundColor: ['#22c55e', '#6366f1'],
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
}
</script>

<template>
  <section class="max-w-5xl mx-auto mt-10 space-y-8">
    <h1 class="text-2xl font-bold">Global statistics</h1>

    <p v-if="error" class="text-red-500">{{ error }}</p>
    <p v-else-if="loading">Loading…</p>

    <div v-else-if="globalStats" class="space-y-8">
      <!-- Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div :class="cn('p-4 bg-white shadow rounded')">
          <p class="text-sm text-gray-500">Total players</p>
          <p class="text-xl font-semibold">{{ globalStats.total_players }}</p>
        </div>

        <div :class="cn('p-4 bg-white shadow rounded')">
          <p class="text-sm text-gray-500">Total admins</p>
          <p class="text-xl font-semibold">{{ globalStats.total_admins }}</p>
        </div>

        <div :class="cn('p-4 bg-white shadow rounded')">
          <p class="text-sm text-gray-500">Multiplayer games</p>
          <p class="text-xl font-semibold">{{ globalStats.total_games }}</p>
        </div>

        <div :class="cn('p-4 bg-white shadow rounded')">
          <p class="text-sm text-gray-500">Multiplayer matches</p>
          <p class="text-xl font-semibold">{{ globalStats.total_matches }}</p>
        </div>

        <div :class="cn('p-4 bg-white shadow rounded')">
          <p class="text-sm text-gray-500">Coin purchases</p>
          <p class="text-xl font-semibold">{{ globalStats.total_purchases }}</p>
        </div>

        <div :class="cn('p-4 bg-white shadow rounded')">
          <p class="text-sm text-gray-500">Total purchases (€)</p>
          <p class="text-xl font-semibold">
            {{ globalStats.total_purchases_euros }}
          </p>
        </div>
      </div>

      <!-- Chart -->
      <div class="p-4 bg-white shadow rounded h-64">
        <p class="text-sm text-gray-500 mb-2">Games by variant</p>
        <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </section>
</template>
