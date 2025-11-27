<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Welcome to the Game!</h2>
        <p class="mt-2 text-sm text-gray-600">You are playing <strong>{{ mode }}</strong> with <strong>{{ variant }}</strong> variant.</p>
      </div>

      <div v-if="warning" class="mb-4 text-red-600 font-semibold">
        {{ warning }}
      </div>

      <div class="flex gap-4 mb-8 justify-center">
        <Button
          @click="dealCards(3)"
          variant="outline"
          :disabled="isGameActive"
          class="w-full py-3 px-6 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
        >
          Deal Bisca de 3
        </Button>

        <Button
          @click="dealCards(9)"
          variant="default"
          :disabled="isGameActive"
          class="w-full py-3 px-6 text-center bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none"
        >
          Deal Bisca de 9
        </Button>
      </div>

      <!-- Score Display -->
      <div class="flex gap-8 mb-8 text-lg font-semibold justify-center">
        <div class="text-center">
          <div class="text-blue-600">You: {{ game.player1Points }} pts</div>
          <div class="text-sm text-gray-600">Marks: {{ game.player1Marks }}</div>
        </div>
        <div class="text-center">
          <div class="text-red-600">Bot: {{ game.player2Points }} pts</div>
          <div class="text-sm text-gray-600">Marks: {{ game.player2Marks }}</div>
        </div>
      </div>

      <div v-if="game.winner" class="mb-4 text-2xl font-bold text-green-600 text-center">
        {{ game.winner === 1 ? 'You Win!' : game.winner === 2 ? 'Bot Wins!' : 'Draw!' }}
      </div>
      <div v-else-if="game.currentTurn" class="mb-4 text-lg font-semibold text-center">
        {{ game.currentTurn === 1 ? '🟢 Your Turn' : '🤖 Bot is thinking...' }}
      </div>

      <!-- Board -->
      <div class="w-full max-w-4xl mb-12 mx-auto">
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

      <div class="w-full max-w-4xl mx-auto mb-8">
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

      <div class="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
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
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from "@/stores/game"
import { Button } from "@/components/ui/button"
import { ref, computed } from "vue"
import { useRoute } from "vue-router"

const game = useGameStore()
const warning = ref("")

const route = useRoute();

const mode = route.params.mode
const variant = route.params.variant

const isGameActive = computed(() => {
  return game.player1.length > 0 || game.player2.length > 0 || game.remainingDeck.length > 0
})

const dealCards = (num) => {
  game.deal(num)
}

const playCard = (player, index) => {
  const result = game.playCard(player, index)
  if (!result.success) {
    warning.value = result.message
    setTimeout(() => {
      warning.value = ""
    }, 2000);
  }
}

const drawCard = () => {
  if (game.currentTurn !== 1) {
    warning.value = "Not your turn to draw!"
    setTimeout(() => {
      warning.value = ""
    }, 2000);
    return
  }
  
  const result = game.drawCards(1)
  if (!result.success) {
    warning.value = result.message
    setTimeout(() => {
      warning.value = ""
    }, 2000);
  }
}
</script>

<style scoped>
</style>