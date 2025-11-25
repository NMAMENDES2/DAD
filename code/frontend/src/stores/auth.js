import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { useAPIStore } from './api'

export const useAuthStore = defineStore('auth', () => {
  const apiStore = useAPIStore()

  const currentUser = ref(undefined)

  const isLoggedIn = computed(() => {
    return !!localStorage.getItem('token')
  })

  const currentUserID = computed(() => {
    return currentUser.value?.id
  })

  onMounted(async () => {
    if (isLoggedIn.value) {
      const response = await apiStore.getAuthUser()
      currentUser.value = response.data
    }
  })

  const login = async (credentials) => {
    const r = await apiStore.postLogin(credentials)
    localStorage.setItem('token', r.data.token)
    apiStore.setAuthorizationHeader(r.data.token)

    const response = await apiStore.getAuthUser()
    currentUser.value = response.data
    return response.data
  }
  
  const register = async (credentials) => {
    const response = await apiStore.postRegister(credentials)
    return response.data
  }

  const logout = async () => {
    await apiStore.postLogout()
    localStorage.removeItem('token')
    currentUser.value = undefined
  }

  return {
    currentUser,
    isLoggedIn,
    currentUserID,
    login,
    logout,
    register,
  }
})
