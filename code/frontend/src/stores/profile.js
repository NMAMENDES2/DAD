import { defineStore } from 'pinia'
import axios from 'axios'
import { inject, ref } from 'vue'

export const useProfileStore = defineStore('profile', () => {
  const API_BASE_URL = inject('apiBaseURL')
  const loading = ref(false)
  const message = ref(null)

 const updateEmail = async (data) => {
  try {
    loading.value = true
    message.value = null
    const response = await axios.put(`${API_BASE_URL}/profile/email`, { 
      email: data.email,
    })
    message.value = response.data.message
    return response.data
  } catch (err) {
    message.value = err.response?.data?.message || 'Failed to update email'
    throw err
  } finally {
    loading.value = false
  }
}

  const updateName = async (name) => {
    try {
      loading.value = true
      message.value = null
      const response = await axios.put(`${API_BASE_URL}/profile/name`, {
        name
      })
      console.log(response.data)
      return response.data
    } catch (err) {
      message.value = err.response?.data?.message || 'Failed to update name'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateNickname = async (nickname) => {
    try {
      loading.value = true
      message.value = null
      const response = await axios.put(`${API_BASE_URL}/profile/nickname`, {
        nickname
      })
      return response.data
    } catch (err) {
      message.value = err.response?.data?.message || 'Failed to update nickname'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePassword = async (data) => {
    try {
      loading.value = true
      message.value = null
      const response = await axios.put(`${API_BASE_URL}/profile/password`, {
        current_password: data.current_password,
        password: data.password,
        password_confirmation: data.password_confirmation
      })
      return response.data
    } catch (err) {
      message.value = err.response?.data?.message || 'Failed to update password'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateAvatar = async (file) => {
  try {
    loading.value = true
    message.value = null
    
    const formData = new FormData()
    formData.append('avatar', file)
    
    const response = await axios.post(`${API_BASE_URL}/profile/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
    
    message.value = response.data.message
    return response.data
  } catch (err) {
    message.value = err.response?.data?.message || 'Failed to upload avatar'
    throw err
  } finally {
    loading.value = false
  }
  }

  const deleteAccount = async (password) => {
    try {
      loading.value = true
      message.value = null
      const response = await axios.delete(`${API_BASE_URL}/profile`, {
        data: { password }
      })
      return response.data
    } catch (err) {
      message.value = err.response?.data?.message || 'Failed to delete account'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    message,
    updateEmail,
    updateName,
    updateNickname,
    updatePassword,
    updateAvatar,
    deleteAccount
  }
})