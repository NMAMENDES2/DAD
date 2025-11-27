<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Choose Your Game Mode</h2>
        <p class="mt-2 text-sm text-gray-600">Select a mode to start playing</p>
      </div>

      <div class="mt-8 space-y-4">
        <div v-if="!currentGameMode" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button
            @click="setGameMode('SINGLE_PLAYER_MATCH')"
            class="w-full py-3 px-6 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
          >
            Single Player Match
          </Button>

          <Button
            @click="setGameMode('SINGLE_PLAYER_GAME')"
            class="w-full py-3 px-6 text-center bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none"
          >
            Single Player Game
          </Button>

          <Button
            v-if="isLoggedIn"
            @click="setGameMode('MULTIPLAYER_MATCH')"
            class="w-full py-3 px-6 text-center bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none"
          >
            Multiplayer Match
          </Button>

          <Button
            v-if="isLoggedIn"
            @click="setGameMode('MULTIPLAYER_GAME')"
            class="w-full py-3 px-6 text-center bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none"
          >
            Multiplayer Game
          </Button>
        </div>

        <div v-if="currentGameMode" class="space-y-4">
          <p class="text-xl text-gray-800">Choose Game Variant</p>

          <Button
            @click="setGameVariant('BISCA_DE_3')"
            class="w-full py-3 px-6 text-center bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none"
          >
            Bisca de 3
          </Button>

          <Button
            @click="setGameVariant('BISCA_DE_9')"
            class="w-full py-3 px-6 text-center bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none"
          >
            Bisca de 9
          </Button>
        </div>

        <div v-if="currentGameMode && currentGameVariant" class="mt-6 text-center">
          <Button
            @click="startGame"
            class="w-full py-3 px-6 text-center bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none"
          >
            Start Game
          </Button>
        </div>

        <div v-if="currentGameMode && currentGameVariant" class="mt-6 text-center text-xl text-gray-800">
          <p>You have selected: <strong>{{ currentGameMode }}</strong> with <strong>{{ currentGameVariant }}</strong> variant</p>
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

const gameModes = {
  SINGLE_PLAYER_MATCH: 'Single Player Match',
  SINGLE_PLAYER_GAME: 'Single Player Game',
  MULTIPLAYER_MATCH: 'Multiplayer Match',
  MULTIPLAYER_GAME: 'Multiplayer Game',
}

const gameVariants = {
  BISCA_DE_3: 'Bisca de 3',
  BISCA_DE_9: 'Bisca de 9',
}

const authStore = useAuthStore()
const router = useRouter()

const currentGameMode = ref('')
const currentGameVariant = ref('')

const isLoggedIn = computed(() => authStore.isLoggedIn)

const setGameMode = (mode) => {
  currentGameMode.value = gameModes[mode]
  currentGameVariant.value = ''  
}

const setGameVariant = (variant) => {
  currentGameVariant.value = gameVariants[variant]
}

const startGame = () => {
  if (currentGameMode.value && currentGameVariant.value) {
    router.push({ name: 'GamePage', params: { mode: currentGameMode.value, variant: currentGameVariant.value } })
  }
}
</script>

<style scoped>
</style>
