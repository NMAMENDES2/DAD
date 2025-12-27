import { defineStore } from 'pinia'
import axios from 'axios'
import { inject, ref } from 'vue'

export const useAPIStore = defineStore('api', () => {
  const API_BASE_URL = inject('apiBaseURL')

  const token = ref(localStorage.getItem('token'))

  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  const setAuthorizationHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }

  const gameQueryParameters = ref({
    page: 1,
    filters: {
      type: '',
      status: '',
      sort_by: 'began_at',
      sort_direction: 'desc',
    },
  })

  const transactionQueryParameters = ref({
    page: 1,
    filters: {
      type: '',
      sort_by: 'transaction_datetime',
      sort_direction: 'desc',
    }
  })

  // PURCHASE
  const postPurchase = async (purchaseData) => {
    const response = await axios.post(`${API_BASE_URL}/purchase`, purchaseData)
    return response
  }

  // AUTH
  const postLogin = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/login`, credentials)
    token.value = response.data.token
    localStorage.setItem('token', token.value)
    setAuthorizationHeader(token.value)
    return response
  }

  const postLogout = async () => {
    await axios.post(`${API_BASE_URL}/logout`)
    token.value = undefined
    localStorage.removeItem('token')
    setAuthorizationHeader(null)
  }

  const postRegister = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/register`, credentials)
    return response
  }

  // Users
  const getAuthUser = () => {
    return axios.get(`${API_BASE_URL}/users/me`)
  }

  const getUserTransaction = (resetPagination = false) => {
  if (resetPagination) {
    transactionQueryParameters.value.page = 1
  }

  const queryParams = new URLSearchParams({
    page: transactionQueryParameters.value.page,

    ...(transactionQueryParameters.value.filters.type && {
      type: transactionQueryParameters.value.filters.type,
    }),

    sort_by: transactionQueryParameters.value.filters.sort_by,
    sort_direction: transactionQueryParameters.value.filters.sort_direction,
  }).toString()

  return axios.get(`${API_BASE_URL}/transactions?${queryParams}`)
}


  // Games
  const getGames = (resetPagination = false) => {
    if (resetPagination) {
      gameQueryParameters.value.page = 1
    }

    const queryParams = new URLSearchParams({
      page: gameQueryParameters.value.page,
      ...(gameQueryParameters.value.filters.type && {
        type: gameQueryParameters.value.filters.type,
      }),
      ...(gameQueryParameters.value.filters.status && {
        status: gameQueryParameters.value.filters.status,
      }),
      sort_by: gameQueryParameters.value.filters.sort_by,
      sort_direction: gameQueryParameters.value.filters.sort_direction,
    }).toString()

    return axios.get(`${API_BASE_URL}/games?${queryParams}`)
  }

  const getBalance = () => {
    return axios.get(`${API_BASE_URL}/balance`)
  }

  const getLeaderboard = () => axios.get(`${API_BASE_URL}/leaderboard`)

  const getMyStats = () => axios.get(`${API_BASE_URL}/statistics/me`)

  const getGlobalStats = () => axios.get(`${API_BASE_URL}/statistics/global`)

  const getMatches = () => axios.get(`${API_BASE_URL}/matches`)
  const createMatch = (payload) => axios.post(`${API_BASE_URL}/matches`, payload)

  return {
    postLogin,
    postRegister,
    postLogout,
    postPurchase,
    getAuthUser,
    getGames,
    getUserTransaction,
    getBalance,
    gameQueryParameters,
    transactionQueryParameters,
    setAuthorizationHeader,
    getLeaderboard,
    getMyStats,
    getGlobalStats,
    getMatches,
    createMatch
  }
})
