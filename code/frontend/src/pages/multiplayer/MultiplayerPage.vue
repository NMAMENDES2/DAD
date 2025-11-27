<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
    <div class="w-full max-w-4xl space-y-6">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">{{ variant }}</h2>
        <p class="mt-2 text-sm text-gray-600">{{ mode }}</p>
        <p v-if="roomCode" class="mt-1 text-xs font-semibold text-blue-600">Room: {{ roomCode }}</p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="p-4 bg-red-100 border border-red-400 rounded-lg text-center">
        <p class="text-red-800 font-semibold">{{ error }}</p>
      </div>

      <!-- Waiting for Opponent -->
      <div v-if="!gameState" class="p-4 bg-blue-100 border border-blue-400 rounded-lg text-center">
        <p class="text-blue-800 font-semibold">Waiting for opponent...</p>
        <p class="text-blue-600 text-sm mt-2">Room Code: <strong>{{ roomCode }}</strong></p>
      </div>

      <!-- Game Content -->
      <div v-if="gameState">
        <!-- Timer -->
        <div v-if="gameState.isYourTurn && !gameState.winner" class="flex justify-center items-center space-x-4">
          <span class="text-lg font-semibold" :class="timeRemaining <= 5 ? 'text-red-600' : 'text-blue-600'">
            ⏱️ {{ timeRemaining }}s
          </span>
          <div class="w-64 bg-gray-200 rounded-full h-3">
            <div 
              class="h-3 rounded-full transition-all"
              :class="timeRemaining <= 5 ? 'bg-red-600' : 'bg-blue-600'"
              :style="{ width: (timeRemaining / 20 * 100) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Scores -->
        <div class="flex justify-center gap-12 text-lg font-semibold">
          <div class="text-center">
            <div class="text-blue-600">You: {{ gameState.yourPoints || 0 }} pts</div>
            <div class="text-sm text-gray-600">Marks: {{ gameState.yourMarks || 0 }}</div>
          </div>
          <div class="text-center">
            <div class="text-red-600">Opponent: {{ gameState.opponentPoints || 0 }} pts</div>
            <div class="text-sm text-gray-600">Marks: {{ gameState.opponentMarks || 0 }}</div>
          </div>
        </div>

        <!-- Winner -->
        <div v-if="gameState.winner" class="text-center space-y-4">
          <div class="text-3xl font-bold" :class="gameState.winner === 'you' ? 'text-green-600' : 'text-red-600'">
            {{ gameState.winner === 'you' ? '🎉 You Win!' : '😔 Opponent Wins!' }}
          </div>
          <button
            @click="goBackToMenu"
            class="py-2 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Menu
          </button>
        </div>

        <!-- Turn Indicator -->
        <div v-else class="text-center text-lg font-semibold">
          {{ gameState.isYourTurn ? '🟢 Your Turn' : '⏳ Opponent\'s Turn' }}
        </div>

        <!-- Board -->
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-3">Board</h3>
          <div class="flex justify-center gap-4">
            <div v-for="(card, idx) in gameState.board" :key="idx" class="w-20 h-28 bg-white rounded shadow">
              <img v-if="card.image" :src="card.image" :alt="card.title" class="w-full h-full object-contain" />
            </div>
            <div v-if="!gameState.board || gameState.board.length === 0" class="w-20 h-28 border-2 border-dashed rounded flex items-center justify-center text-gray-400">
              Empty
            </div>
          </div>
        </div>

        <!-- Your Hand -->
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-3">Your Hand</h3>
          <div class="flex justify-center gap-3">
            <div
              v-for="(card, idx) in gameState.yourHand"
              :key="idx"
              class="w-20 h-28 bg-white rounded shadow cursor-pointer hover:scale-105 transition"
              :class="{ 'opacity-50': !gameState.isYourTurn, 'ring-2 ring-blue-500': gameState.isYourTurn }"
              @click="playCard(idx)"
            >
              <img v-if="card.image" :src="card.image" :alt="card.title" class="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <!-- Trump -->
        <div v-if="gameState.trump" class="flex justify-center">
          <div class="text-center">
            <p class="text-sm font-semibold mb-2">Trump</p>
            <div class="w-20 h-28 bg-white rounded shadow">
              <img :src="gameState.trump.image" :alt="gameState.trump.title" class="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <!-- Resign Button -->
        <div v-if="!gameState.winner" class="flex justify-center">
          <button
            @click="showResignModal = true"
            class="py-2 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Resign
          </button>
        </div>
      </div>

      <!-- Resign Modal -->
      <div v-if="showResignModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="showResignModal = false">
        <div class="bg-white p-6 rounded-lg max-w-md" @click.stop>
          <h3 class="text-xl font-bold mb-4">Confirm Resignation</h3>
          <p class="mb-4">Are you sure you want to resign? Your opponent will win.</p>
          <div class="flex gap-4">
            <button
              @click="resign"
              class="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Yes, Resign
            </button>
            <button
              @click="showResignModal = false"
              class="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSocketStore } from '@/stores/socket'

const route = useRoute()
const router = useRouter()
const socket = useSocketStore()

const variant = ref(route.params.variant)
const mode = ref(route.params.mode)
const roomCode = ref(route.params.roomCode)

const gameState = ref(null)
const error = ref('')
const timeRemaining = ref(20)
const timerInterval = ref(null)
const showResignModal = ref(false)

const playCard = (cardIndex) => {
  if (!gameState.value?.isYourTurn) {
    error.value = 'Not your turn!'
    setTimeout(() => error.value = '', 2000)
    return
  }

  socket.emit('play-card', {
    roomCode: roomCode.value,
    cardIndex: cardIndex
  })
}

const resign = () => {
  showResignModal.value = false
  socket.emit('resign', { roomCode: roomCode.value })
}

const goBackToMenu = () => {
  socket.emit('leave-room', { roomCode: roomCode.value })
  router.push({ name: 'Home' })
}

const startTimer = () => {
  if (timerInterval.value) clearInterval(timerInterval.value)
  timeRemaining.value = 20
  timerInterval.value = setInterval(() => {
    timeRemaining.value--
    if (timeRemaining.value <= 0) {
      clearInterval(timerInterval.value)
    }
  }, 1000)
}

onMounted(() => {
  if (!roomCode.value) {
    router.push({ name: 'Home' })
    return
  }

  socket.on('game-started', (data) => {
    gameState.value = data
    if (data.isYourTurn) startTimer()
  })

  socket.on('game-state-update', (data) => {
    gameState.value = data
    if (data.isYourTurn && !data.winner) {
      startTimer()
    } else if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }
  })

  socket.on('opponent-resigned', (data) => {
    error.value = 'Opponent resigned. You win!'
    if (data.gameState) gameState.value = data.gameState
  })

  socket.on('opponent-disconnected', () => {
    error.value = 'Opponent disconnected'
  })

  socket.on('invalid-move', (data) => {
    error.value = data.message || 'Invalid move'
    setTimeout(() => error.value = '', 2000)
  })

  socket.emit('request-game-state', { roomCode: roomCode.value })
})

onUnmounted(() => {
  if (timerInterval.value) clearInterval(timerInterval.value)
  socket.off('game-started')
  socket.off('game-state-update')
  socket.off('opponent-resigned')
  socket.off('opponent-disconnected')
  socket.off('invalid-move')
})
</script>