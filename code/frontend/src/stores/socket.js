// stores/socket.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const connected = ref(false)
  const listeners = new Map()

   const handleConnection = () => {
    socket.on('connect', () => {
      console.log(`[Socket] Connected -- ${socket.id}`)
    })
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected -- ${socket.id}`)
    })
  }

  // Initialize the socket instance
  const init = (socketInstance) => {
    socket.value = socketInstance
    connected.value = socket.value.connected

    socket.value.on('connect', () => {
      console.log(`[Socket] Connected -- ${socket.value.id}`)
      connected.value = true
    })

    socket.value.on('disconnect', () => {
      console.log(`[Socket] Disconnected -- ${socket.value.id}`)
      connected.value = false
    })
  }

  const emit = (event, data) => {
    if (!connected.value) return console.warn('[Socket] Emit blocked – not connected:', event)
    socket.value.emit(event, data)
  }

  const on = (event, callback) => {
    listeners.set(event, callback)
    socket.value.on(event, callback)
  }

  const off = (event) => {
    const cb = listeners.get(event)
    if (cb) {
      socket.value.off(event, cb)
      listeners.delete(event)
    }
  }

  return { socket, connected, init, emit, on, off, handleConnection }
})
