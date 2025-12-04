<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Welcome to the Game!</h2>
        <p class="mt-2 text-sm text-gray-600">You are playing <strong>{{ mode }}</strong> with <strong>{{ variant }}</strong> variant.</p>
        <p v-if="isMultiplayer && roomCode" class="mt-1 text-xs font-semibold text-blue-600">Room: {{ roomCode }}</p>
      </div>

      <div v-if="warning" class="mb-4 text-red-600 font-semibold text-center">
        {{ warning }}
      </div>

      <div v-if="!isMultiplayer && !isGameActive" class="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-center">
        <p class="text-yellow-800 font-semibold mb-2">Game state was lost. Please start a new game!</p>
        <div class="flex gap-4 justify-center mt-4">
          <Button
            @click="dealCards(numCards)"
            class="py-2 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Start {{ variant }}
          </Button>
        </div>
        <Button
          @click="goBackToMenu"
          class="mt-2 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Back to Menu
        </Button>
      </div>

      <div v-if="!isMultiplayer" class="flex gap-8 mb-8 text-lg font-semibold justify-center">
        <div class="text-center">
          <div class="text-blue-600">You: {{ game.player1Points }} pts</div>
          <div class="text-sm text-gray-600">Marks: {{ game.player1Marks }}</div>
        </div>
        <div class="text-center">
          <div class="text-red-600">Bot: {{ game.player2Points }} pts</div>
          <div class="text-sm text-gray-600">Marks: {{ game.player2Marks }}</div>
        </div>
      </div>

      <div v-if="!isMultiplayer && game.winner" class="mb-4 text-2xl font-bold text-green-600 text-center">
        {{ game.winner === 1 ? 'You Win!' : game.winner === 2 ? 'Bot Wins!' : 'Draw!' }}
      </div>
      
      <div v-if="!isMultiplayer && game.winner" class="flex justify-center gap-4 mb-4">
        <Button
          @click="resetGame"
          class="py-2 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
        >
          Play Again
        </Button>
        <Button
          @click="goBackToMenu"
          class="py-2 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none"
        >
          Back to Menu
        </Button>
      </div>
      
      <div v-else-if="!isMultiplayer && isGameActive" class="flex justify-center mb-4">
        <Button
          @click="resetGame"
          class="py-2 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none"
        >
          New Game
        </Button>
      </div>
      
      <div v-else-if="!isMultiplayer && game.currentTurn" class="mb-4 text-lg font-semibold text-center">
        {{ game.currentTurn === 1 ? '🟢 Your Turn' : '🤖 Bot is thinking...' }}
      </div>

      <!-- Single Player: Board -->
      <div v-if="!isMultiplayer" class="w-full max-w-4xl mb-12 mx-auto">
        <h2 class="text-xl font-semibold mb-2 text-center">Board</h2>
        <div class="flex justify-center space-x-6">
          <div 
            v-for="(cardItem, index) in game.board" 
            :key="index" 
            class="w-24 h-32 flex items-center justify-center shadow-lg rounded-lg bg-white"
          >
            <img :src="cardItem.image" :alt="cardItem.title" class="w-full h-full object-contain" />
          </div>
          <div v-if="game.board.length === 0" class="w-24 h-32 flex items-center justify-center border-2 border-dashed rounded-lg text-gray-400">
            Empty
          </div>
        </div>
      </div>

      <!-- Single Player: Your Hand -->
      <div v-if="!isMultiplayer" class="w-full max-w-4xl mx-auto mb-8">
        <h2 class="text-xl font-semibold mb-2 text-center">Your Hand (Player 1)</h2>
        <div class="flex justify-center space-x-4">
          <div
            v-for="(cardItem, index) in game.player1"
            :key="index"
            class="w-24 h-32 flex items-center justify-center shadow-lg rounded-lg bg-white cursor-pointer hover:scale-105 transition-transform"
            :class="{ 'opacity-50': game.currentTurn !== 1 || game.waitingForDraw }"
            @click="playCard(1, index)"
          >
            <img :src="cardItem.image" :alt="cardItem.title" class="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <!-- Single Player: Deck and Trump -->
      <div v-if="!isMultiplayer" class="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
        <div
          v-if="game.remainingDeck.length > 0"
          class="w-24 h-32 flex items-center justify-center shadow-lg rounded-lg bg-white cursor-pointer hover:scale-105 transition-transform"
          :class="{ 'ring-4 ring-yellow-400': game.waitingForDraw && game.currentTurn === 1 }"
          @click="drawCard()"
        >
          <img :src="game.faceDownCard.image" alt="Deck - Click to draw" class="w-full h-full object-contain" />
        </div>
        <div v-if="game.remainingDeck.length > 0" class="text-sm font-semibold text-gray-600">
          {{ game.remainingDeck.length }} cards
        </div>

        <div v-if="game.trump" class="w-24 h-32 flex items-center justify-center shadow-lg rounded-lg bg-white">
          <img :src="game.trump.image" :alt="game.trump.title" class="w-full h-full object-contain" />
        </div>
        <div v-if="game.trump" class="text-xs font-semibold text-gray-600">
          Trump
        </div>
      </div>

      <!-- Multiplayer UI - show message that it needs separate component -->
      <div v-if="isMultiplayer" class="mb-4 p-4 bg-blue-100 border border-blue-400 rounded-lg text-center">
        <p class="text-blue-800 font-semibold">Multiplayer game loading...</p>
        <p class="text-blue-600 text-sm mt-2">This should use the MultiplayerGame component</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from "@/stores/game"
import { Button } from "@/components/ui/button"
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"

const game = useGameStore()
const warning = ref("")
const router = useRouter()
const route = useRoute()

const mode = route.params.mode
const variant = route.params.variant
const roomCodeParam = route.params.roomCode

const isMultiplayer = computed(() => mode && mode.includes('Multiplayer'))
const roomCode = ref(roomCodeParam || null)

// Determine the number of cards based on variant
const numCards = computed(() => {
  return variant === 'Bisca de 3' ? 3 : 9
})

// Store mode and variant in memory when component mounts
onMounted(() => {
  if (mode && variant) {
    window.gameSession = { mode, variant, roomCode: roomCodeParam }
    
    // If multiplayer with room code, redirect to multiplayer game component
    if (isMultiplayer.value && roomCodeParam) {
      // For now, show message. In production, you'd route to separate multiplayer component
      console.log('Should load multiplayer game with room:', roomCodeParam)
    }
  } else if (window.gameSession) {
    router.replace({ 
      name: 'GamePage', 
      params: { 
        mode: window.gameSession.mode, 
        variant: window.gameSession.variant,
        roomCode: window.gameSession.roomCode
      } 
    })
  } else {
    router.push({ name: 'Home' })
  }
})

const isGameActive = computed(() => {
  return game.player1.length > 0 || game.player2.length > 0 || game.remainingDeck.length > 0
})

// Watch for when player needs to draw and auto-draw (single player only)
watch(() => game.waitingForDraw, (newVal) => {
  if (!isMultiplayer.value && newVal && game.currentTurn === 1 && game.remainingDeck.length > 0) {
    setTimeout(() => {
      game.drawCards(1)
    }, 800)
  }
})

const dealCards = (num) => {
  game.deal(num)
}

const resetGame = () => {
  warning.value = ""
  game.deal(numCards.value)
}

const goBackToMenu = () => {
  window.gameSession = null
  router.push({ name: 'Home' })
}

const playCard = (player, index) => {
  const result = game.playCard(player, index)
  if (!result.success) {
    warning.value = result.message
    setTimeout(() => {
      warning.value = ""
    }, 2000)
  }
}

const drawCard = () => {
  if (game.currentTurn !== 1) {
    warning.value = "Not your turn to draw!"
    setTimeout(() => {
      warning.value = ""
    }, 2000)
    return
  }
  
  const result = game.drawCards(1)
  if (!result.success) {
    warning.value = result.message
    setTimeout(() => {
      warning.value = ""
    }, 2000)
  }
}
</script>

<style scoped>
</style>