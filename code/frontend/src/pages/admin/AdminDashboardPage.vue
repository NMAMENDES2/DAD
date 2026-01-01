<script setup>
import { ref } from 'vue'
import AdminUsersPage from './AdminUsersPage.vue'

// importa usando caminhos absolutos (mesmo padrão que usas no resto do projeto)
import GlobalStatisticsPage from '@/pages/statistics/GlobalStatisticsPage.vue'
import MyGamesPage from '@/pages/games/MyGamesPage.vue'
import MyMatchesPage from '@/pages/matches/MyMatchesPage.vue'

const tab = ref('users')
</script>

<template>
  <section class="max-w-6xl mx-auto mt-10">
    <h1 class="text-2xl font-bold mb-4">Administration</h1>

    <nav class="flex gap-2 mb-6 text-sm">
      <button
        class="px-3 py-1 rounded border"
        :class="tab === 'users' ? 'bg-gray-900 text-white' : 'bg-white'"
        @click="tab = 'users'"
      >
        Users
      </button>
      <button
        class="px-3 py-1 rounded border"
        :class="tab === 'transactions' ? 'bg-gray-900 text-white' : 'bg-white'"
        @click="tab = 'transactions'"
      >
        Transactions
      </button>
      <button
        class="px-3 py-1 rounded border"
        :class="tab === 'games' ? 'bg-gray-900 text-white' : 'bg-white'"
        @click="tab = 'games'"
      >
        Games
      </button>
      <button
        class="px-3 py-1 rounded border"
        :class="tab === 'matches' ? 'bg-gray-900 text-white' : 'bg-white'"
        @click="tab = 'matches'"
      >
        Matches
      </button>
      <button
        class="px-3 py-1 rounded border"
        :class="tab === 'stats' ? 'bg-gray-900 text-white' : 'bg-white'"
        @click="tab = 'stats'"
      >
        Stats
      </button>
    </nav>

    <div v-if="tab === 'users'">
      <AdminUsersPage />
    </div>

    <div v-else-if="tab === 'transactions'">
      <!-- Reutiliza a tua página de transações mas ligada a getAdminTransactions -->
      <p class="text-sm text-gray-500">
        TODO: build admin transactions view (read-only).
      </p>
    </div>

    <div v-else-if="tab === 'games'">
      <!-- Podes criar uma tabela semelhante às tuas páginas atuais mas com getAdminGames -->
      <p class="text-sm text-gray-500">
        TODO: build admin games view (read-only).
      </p>
    </div>

    <div v-else-if="tab === 'matches'">
      <!-- Podes criar uma tabela semelhante às tuas páginas atuais mas com getAdminMatches -->
      <p class="text-sm text-gray-500">
        TODO: build admin matches view (read-only).
      </p>
    </div>

    <div v-else-if="tab === 'stats'">
      <!-- Reutiliza GlobalStatisticsPage como leitura global -->
      <GlobalStatisticsPage />
    </div>
  </section>
</template>
