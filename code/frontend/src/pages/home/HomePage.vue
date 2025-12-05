<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Choose Your Game Mode</h2>
        <p class="mt-2 text-sm text-gray-600">Select a mode to start playing</p>
      </div>

      <div class="mt-8 space-y-4">
        <div v-if="!currentGameMode" class="grid gap-4"
          :class="isLoggedIn ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 place-items-center'">
          <Button 
            class="w-full py-3 px-6 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Single Player
          </Button>

          <Button 
          @click="goMultiplayer"
          v-if="isLoggedIn"
          class="w-full py-3 px-6 text-center bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
            Multiplayer
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'


const authStore = useAuthStore()
const router = useRouter()

const isLoggedIn = computed(() => authStore.isLoggedIn)

const goMultiplayer = () => {
  router.push('/multiplayer')
}

</script>

<style scoped></style>
