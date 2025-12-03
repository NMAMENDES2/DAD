<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAPIStore } from '@/stores/api'

const authStore = useAuthStore()
const apiStore = useAPIStore()

const balance = ref(null)
const loading = ref(true)

const fetchBalance = async () => {
  loading.value = true
  try {
    const response = await apiStore.getBalance() // axios call to /balance
    balance.value = response.data.data
  } catch (err) {
    console.error('Failed to fetch balance:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchBalance()
})
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <h2 class="text-2xl font-bold mb-4">Profile</h2>

    <div class="border p-4 rounded shadow mb-4">
      <p><strong>Name:</strong> {{ authStore.currentUser?.name || 'N/A' }}</p>
      <p><strong>Nickname:</strong> {{ authStore.currentUser?.nickname || 'N/A' }}</p>
      <p><strong>Email:</strong> {{ authStore.currentUser?.email || 'N/A' }}</p>
    </div>

    <div class="border p-4 rounded shadow">
      <p><strong>Balance:</strong></p>
      <div v-if="loading" class="animate-spin w-6 h-6 border-2 border-gray-300 rounded-full"></div>
      <div v-else>{{ balance ?? 'N/A' }}€</div>
    </div>
  </div>
</template>

<style scoped>
/* optional styling for loader */
</style>
