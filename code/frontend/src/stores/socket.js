import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null)
  const connected = ref(false)
  const listeners = new Map()

  const init = (socketInstance) => {
    if (socket.value) {
      console.log('[Socket] Already initialized, cleaning up first')
      cleanup()
    }

    console.log('[Socket] init called, socketInstance:', socketInstance)
    socket.value = socketInstance
    connected.value = socket.value?.connected || false

    if (!socket.value) {
      console.error('[Socket] Socket instance is undefined!')
      return
    }

    // Set up connection listeners
    socket.value.on('connect', () => {
      console.log(`[Socket] Connected -- ${socket.value.id}`)
      connected.value = true
    })

    socket.value.on('disconnect', () => {
      console.log(`[Socket] Disconnected -- ${socket.value.id}`)
      connected.value = false
    })

    // Re-attach any listeners that were registered before init
    listeners.forEach((callback, event) => {
      console.log(`[Socket] Re-attaching listener for ${event}`)
      socket.value.on(event, callback)
    })
  }

  // emit supports an optional acknowledgement callback: emit(event, data, cb)
  const emit = (event, data, cb) => {
    if (!socket.value) {
      console.warn('[Socket] Emit blocked – not initialized:', event)
      if (typeof cb === 'function') cb({ ok: false, reason: 'not-initialized' })
      return
    }
    if (!connected.value) {
      console.warn('[Socket] Emit blocked – not connected:', event)
      if (typeof cb === 'function') cb({ ok: false, reason: 'not-connected' })
      return
    }

    console.log(`[Socket] Emitting: ${event}`, data)
    try {
      if (typeof cb === 'function') {
        socket.value.emit(event, data, cb)
      } else {
        socket.value.emit(event, data)
      }
    } catch (err) {
      console.error('[Socket] emit error', err)
      if (typeof cb === 'function') cb({ ok: false, reason: 'emit-error' })
    }
  }

  const on = (event, callback) => {
    listeners.set(event, callback)
    console.log(`[Socket] Registering listener for ${event}`)
    
    if (socket.value) {
      socket.value.on(event, callback)
    }
  }

  const off = (event) => {
    const cb = listeners.get(event)
    if (cb) {
      console.log(`[Socket] Removing listener for ${event}`)
      if (socket.value) {
        socket.value.off(event, cb)
      }
      listeners.delete(event)
    }
  }

  const cleanup = () => {
    if (!socket.value) return

    console.log('[Socket] Cleaning up listeners')
    
    listeners.forEach((callback, event) => {
      socket.value.off(event, callback)
    })

    socket.value.off('connect')
    socket.value.off('disconnect')

    socket.value = null
    connected.value = false
  }

  // Backwards-compatible helper used by App.vue
  const handleConnection = () => {
    if (!socket.value) {
      console.warn('[Socket] handleConnection called but socket not initialized')
      return
    }

    // ensure we don't attach duplicate handlers
    try {
      socket.value.off('connect')
      socket.value.off('disconnect')
    } catch (e) {
      // ignore if off not supported yet
    }

    socket.value.on('connect', () => {
      console.log(`[Socket] Connected -- ${socket.value.id}`)
      connected.value = true
    })

    socket.value.on('disconnect', () => {
      console.log(`[Socket] Disconnected -- ${socket.value.id}`)
      connected.value = false
    })
  }

  return { 
    socket, 
    connected, 
    init, 
    emit, 
    on, 
    off, 
    cleanup,
    handleConnection
  }
})
