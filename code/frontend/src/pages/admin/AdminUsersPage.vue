<script setup>
import { ref, onMounted } from 'vue'
import { useAPIStore } from '@/stores/api'

const apiStore = useAPIStore()

const users = ref([])
const meta = ref(null)
const loading = ref(false)
const error = ref(null)

const filters = ref({
  type: '',      // '', 'P', 'A'
  blocked: '',   // '', 'true', 'false'
  page: 1,
})

const newAdmin = ref({
  name: '',
  nickname: '',
  email: '',
  password: '',
})

const loadUsers = async () => {
  loading.value = true
  error.value = null
  try {
    const params = {
      page: filters.value.page,
    }
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.blocked) params.blocked = filters.value.blocked

    const r = await apiStore.getAdminUsers(params)
    users.value = r.data.data ?? r.data
    meta.value = r.data.meta ?? null
  } catch (e) {
    console.error('Failed to load users', e.response?.data || e.message)
    error.value = 'Failed to load users'
  } finally {
    loading.value = false
  }
}

const block = async (user) => {
  if (!confirm(`Block user ${user.nickname}?`)) return
  try {
    await apiStore.blockUser(user.id)
    await loadUsers()
  } catch (e) {
    console.error('Failed to block user', e.response?.data || e.message)
    alert('Failed to block user')
  }
}

const unblock = async (user) => {
  try {
    await apiStore.unblockUser(user.id)
    await loadUsers()
  } catch (e) {
    console.error('Failed to unblock user', e.response?.data || e.message)
    alert('Failed to unblock user')
  }
}

const removeUser = async (user) => {
  if (!confirm(`Delete user ${user.nickname}?`)) return
  try {
    await apiStore.deleteUser(user.id)
    await loadUsers()
  } catch (e) {
    console.error('Failed to delete user', e.response?.data || e.message)
    alert('Failed to delete user')
  }
}

const createAdmin = async () => {
  try {
    await apiStore.createAdminUser(newAdmin.value)
    newAdmin.value = {
      name: '',
      nickname: '',
      email: '',
      password: '',
    }
    await loadUsers()
  } catch (e) {
    console.error('Failed to create admin', e.response?.data || e.message)
    alert('Failed to create admin')
  }
}

const goPage = async (page) => {
  if (!meta.value) return
  if (page < 1 || page > meta.value.last_page) return
  filters.value.page = page
  await loadUsers()
}

onMounted(loadUsers)
</script>

<template>
  <section class="max-w-6xl mx-auto mt-10 space-y-8">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Users administration</h1>
        <p class="text-sm text-gray-500">
          Manage players and administrators.
        </p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="filters.type"
          class="border rounded px-2 py-1 text-sm"
          @change="filters.page = 1; loadUsers()"
        >
          <option value="">All types</option>
          <option value="P">Players</option>
          <option value="A">Admins</option>
        </select>
        <select
          v-model="filters.blocked"
          class="border rounded px-2 py-1 text-sm"
          @change="filters.page = 1; loadUsers()"
        >
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Blocked</option>
        </select>
      </div>
    </header>

    <p v-if="error" class="text-red-500">{{ error }}</p>
    <p v-else-if="loading">Loading…</p>

    <!-- Tabela de utilizadores -->
    <div v-else class="space-y-4">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b bg-gray-50">
            <th class="text-left p-2 text-sm">ID</th>
            <th class="text-left p-2 text-sm">Name</th>
            <th class="text-left p-2 text-sm">Nickname</th>
            <th class="text-left p-2 text-sm">Email</th>
            <th class="text-left p-2 text-sm">Type</th>
            <th class="text-left p-2 text-sm">Blocked</th>
            <th class="text-left p-2 text-sm">Deleted</th>
            <th class="text-left p-2 text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            class="border-b hover:bg-gray-50 text-sm"
          >
            <td class="p-2">{{ u.id }}</td>
            <td class="p-2">{{ u.name }}</td>
            <td class="p-2">{{ u.nickname }}</td>
            <td class="p-2">{{ u.email }}</td>
            <td class="p-2">
              <span
                class="inline-flex px-2 py-0.5 rounded text-xs"
                :class="u.type === 'A' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'"
              >
                {{ u.type === 'A' ? 'Admin' : 'Player' }}
              </span>
            </td>
            <td class="p-2">
              <span
                class="inline-flex px-2 py-0.5 rounded text-xs"
                :class="u.blocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'"
              >
                {{ u.blocked ? 'Blocked' : 'Active' }}
              </span>
            </td>
            <td class="p-2 text-xs text-gray-500">
              {{ u.deleted_at ? 'Yes' : 'No' }}
            </td>
            <td class="p-2 space-x-2">
              <button
                v-if="!u.blocked"
                class="px-2 py-1 text-xs rounded bg-red-100 text-red-700"
                @click="block(u)"
              >
                Block
              </button>
              <button
                v-else
                class="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700"
                @click="unblock(u)"
              >
                Unblock
              </button>
              <button
                class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                @click="removeUser(u)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="8" class="p-4 text-center text-sm text-gray-500">
              No users found.
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginação simples -->
      <div
        v-if="meta"
        class="flex items-center justify-between text-sm text-gray-600"
      >
        <span>
          Page {{ meta.current_page }} of {{ meta.last_page }}
        </span>
        <div class="space-x-2">
          <button
            class="px-2 py-1 border rounded disabled:opacity-50"
            :disabled="meta.current_page <= 1"
            @click="goPage(meta.current_page - 1)"
          >
            Previous
          </button>
          <button
            class="px-2 py-1 border rounded disabled:opacity-50"
            :disabled="meta.current_page >= meta.last_page"
            @click="goPage(meta.current_page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Criar novo admin -->
    <div class="mt-10 border-t pt-6">
      <h2 class="text-lg font-semibold mb-3">Create administrator</h2>
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input
          v-model="newAdmin.name"
          type="text"
          placeholder="Name"
          class="border rounded px-2 py-1 text-sm"
        />
        <input
          v-model="newAdmin.nickname"
          type="text"
          placeholder="Nickname"
          class="border rounded px-2 py-1 text-sm"
        />
        <input
          v-model="newAdmin.email"
          type="email"
          placeholder="Email"
          class="border rounded px-2 py-1 text-sm"
        />
        <input
          v-model="newAdmin.password"
          type="password"
          placeholder="Password"
          class="border rounded px-2 py-1 text-sm"
        />
      </div>
      <button
        class="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded"
        @click="createAdmin"
      >
        Create admin
      </button>
    </div>
  </section>
</template>
