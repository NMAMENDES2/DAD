<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900">Multiplayer Lobby</h2>
        <p class="mt-2 text-sm text-gray-600">{{ variant }}</p>

        <p
          class="mt-1 text-xs"
          :class="socketStore.connected ? 'text-green-600' : 'text-red-600'"
        >
          {{ socketStore.connected ? '🟢 Connected' : '🔴 Disconnected' }}
        </p>
      </div>

      <!-- ERROR -->
      <div v-if="error" class="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg text-center">
        <p class="text-red-800 font-semibold">{{ error }}</p>
      </div>

      <!-- BEFORE JOINING -->
      <div v-if="!roomCode" class="space-y-4">
        <button
          @click="createRoom"
          class="w-full py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Create Room
        </button>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-gray-50 text-gray-500">OR</span>
          </div>
        </div>

        <input
          v-model="joinRoomCode"
          @input="joinRoomCode = joinRoomCode.toUpperCase()"
          class="w-full py-3 px-4 uppercase border rounded-lg focus:ring-2"
          placeholder="Enter Room Code"
          maxlength="6"
        />

        <button
          @click="joinRoom"
          :disabled="joinRoomCode.length !== 6"
          class="w-full py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          Join Room
        </button>
      </div>

      <!-- WAITING FOR PLAYERS -->
      <div v-else-if="!gameStarted" class="space-y-4">
        <div class="p-6 bg-blue-100 rounded-lg border text-center">
          <p class="font-semibold text-lg mb-2">Room Created!</p>
          <p class="text-blue-600">Share this code:</p>

          <p class="text-4xl font-bold tracking-wider mt-2">{{ roomCode }}</p>
          <p class="text-sm mt-4">Waiting for opponent... ({{ playersInRoom }}/2)</p>
        </div>

        <button
          @click="leaveRoom"
          class="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Leave Room
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSocketStore } from '@/stores/socket'

const router = useRouter()
const route = useRoute()
const socketStore = useSocketStore()

const variant = route.params.variant
const mode = route.params.mode

const roomCode = ref('')
const joinRoomCode = ref('')
const error = ref('')
const playersInRoom = ref(1)
const gameStarted = ref(false)

// Random 6-digit room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const createRoom = () => {
  if (!socketStore.connected) {
    error.value = 'Not connected to server.'
    return
  }

  roomCode.value = generateRoomCode()

  socketStore.emit('create-room', {
    roomCode: roomCode.value,
    variant,
    mode
  })
}

const joinRoom = () => {
  if (!socketStore.connected) {
    error.value = 'Not connected to server.'
    return
  }

  error.value = 'Joining room...'

  socketStore.emit('join-room', {
    roomCode: joinRoomCode.value
  })
}

const leaveRoom = () => {
  socketStore.emit('leave-room', { roomCode: roomCode.value })
  roomCode.value = ''
  playersInRoom.value = 1
  error.value = ''
}

const startGame = () => {
  gameStarted.value = true

  router.push({
    name: 'MultiplayerGame',
    params: { mode, variant, roomCode: roomCode.value }
  })
}

// --- EVENT HANDLERS ---
const onRoomCreated = () => {
  playersInRoom.value = 1
}

const onRoomJoined = (data) => {
  roomCode.value = data.roomCode
  playersInRoom.value = data.players

  if (data.players === 2) startGame()
}

const onPlayerJoined = (data) => {
  playersInRoom.value = data.players
  if (data.players === 2) startGame()
}

const onRoomNotFound = () => {
  error.value = 'Room not found'
  joinRoomCode.value = ''
}

const onRoomFull = () => {
  error.value = 'Room is full'
  joinRoomCode.value = ''
}

onMounted(() => {
  socketStore.on('room-created', onRoomCreated)
  socketStore.on('room-joined', onRoomJoined)
  socketStore.on('player-joined', onPlayerJoined)
  socketStore.on('room-not-found', onRoomNotFound)
  socketStore.on('room-full', onRoomFull)
})

onUnmounted(() => {
  socketStore.off('room-created')
  socketStore.off('room-joined')
  socketStore.off('player-joined')
  socketStore.off('room-not-found')
  socketStore.off('room-full')
})
</script>

<style scoped>
</style>
