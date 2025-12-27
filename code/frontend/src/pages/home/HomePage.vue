<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Choose Your Game Mode</h2>
        <p class="mt-2 text-sm text-gray-600">Select a mode to start playing</p>
      </div>

      <div class="mt-8 space-y-4">
        <!-- Botões principais -->
        <div
          v-if="!showVariantChoice && !showStatsChoice"
          class="grid gap-4"
          :class="
            isLoggedIn ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 place-items-center'
          "
        >
          <Button
            class="w-full py-3 px-6 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            @click="showVariantChoice = true"
          >
            Single Player
          </Button>

          <Button
            v-if="isLoggedIn"
            @click="goMultiplayer"
            class="w-full py-3 px-6 text-center bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            Multiplayer
          </Button>

          <!-- Leaderboard (público) -->
          <Button
            class="w-full py-3 px-6 text-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            @click="goLeaderboard"
          >
            Leaderboard
          </Button>

          <!-- Estatísticas: abre escolha -->
          <Button
            class="w-full py-3 px-6 text-center bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            @click="showStatsChoice = true"
          >
            Statistics
          </Button>
        </div>

        <!-- Escolha da variante para Single Player -->
        <div v-else-if="showVariantChoice" class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-700">Choose your variant</p>
          <div class="flex gap-4">
            <Button
              class="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600"
              @click="goSingleplayer('3')"
            >
              Bisca de 3
            </Button>
            <Button
              class="py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              @click="goSingleplayer('9')"
            >
              Bisca de 9
            </Button>
          </div>
          <Button
            class="mt-2 py-1 px-3 text-xs bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            @click="showVariantChoice = false"
          >
            Back
          </Button>
        </div>

        <!-- Escolha entre estatísticas pessoais ou globais -->
        <div v-else-if="showStatsChoice" class="flex flex-col items-center gap-4">
          <p class="text-sm text-gray-700">Which statistics do you want to see?</p>
          <div class="flex gap-4">
            <Button
              v-if="isLoggedIn"
              class="py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              @click="goMyStats"
            >
              My statistics
            </Button>
            <Button
              class="py-2 px-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
              @click="goGlobalStats"
            >
              Global statistics
            </Button>
          </div>
          <Button
            class="mt-2 py-1 px-3 text-xs bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            @click="showStatsChoice = false"
          >
            Back
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
const showVariantChoice = ref(false)
const showStatsChoice = ref(false)

const goMultiplayer = () => {
  router.push('/multiplayer')
}

const goSingleplayer = (variant) => {
  router.push({
    name: 'GamePage',
    params: {
      mode: 'singleplayer',
      variant,
    },
  })
}

const goLeaderboard = () => {
  router.push({ name: 'leaderboard' })
}

const goMyStats = () => {
  router.push({ name: 'my-stats' })
}

const goGlobalStats = () => {
  router.push({ name: 'global-stats' })
}
</script>

<style scoped></style>
