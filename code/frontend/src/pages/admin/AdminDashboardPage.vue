<script setup>
import { ref } from 'vue'
import AdminUsersPage from '@/pages/admin/AdminUsersPage.vue'
import AdminGamesPage from '@/pages/admin/AdminGamesPage.vue'
import AdminTransactionsPage from '@/pages/admin/AdminTransactionsPage.vue'

const currentTab = ref('users')
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8 space-y-6">
    <header>
      <h1 class="text-2xl font-bold">Administration</h1>
      <p class="text-sm text-gray-500">
        Manage users, games, transactions and platform statistics.
      </p>
    </header>

    <nav class="flex gap-2">
      <button
        class="px-3 py-1 border rounded text-sm"
        :class="currentTab === 'users' ? 'bg-gray-800 text-white' : 'bg-white'"
        @click="currentTab = 'users'"
      >
        Users
      </button>
      <button
        class="px-3 py-1 border rounded text-sm"
        :class="currentTab === 'games' ? 'bg-gray-800 text-white' : 'bg-white'"
        @click="currentTab = 'games'"
      >
        Games & Matches
      </button>
      <button
        class="px-3 py-1 border rounded text-sm"
        :class="currentTab === 'transactions' ? 'bg-gray-800 text-white' : 'bg-white'"
        @click="currentTab = 'transactions'"
      >
        Transactions & Stats
      </button>
    </nav>

    <main>
      <AdminUsersPage v-if="currentTab === 'users'" />
      <AdminGamesPage v-else-if="currentTab === 'games'" />
      <AdminTransactionsPage v-else />
    </main>
  </div>
</template>
