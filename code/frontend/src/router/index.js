import GamePage from '@/pages/game/GamePage.vue'
import HomePage from '@/pages/home/HomePage.vue'
import LoginPage from '@/pages/login/LoginPage.vue'
import Lobby from '@/pages/multiplayer/Lobby.vue'
import Multiplayer from '@/pages/multiplayer/Multiplayer.vue'
import Profile from '@/pages/profile/Profile.vue'
import PurchasePage from '@/pages/purchase/PurchasePage.vue'
import RegisterPage from '@/pages/register/RegisterPage.vue'
import LaravelPage from '@/pages/testing/LaravelPage.vue'
import WebsocketsPage from '@/pages/testing/WebsocketsPage.vue'
import TransactionsPage from '@/pages/Transactions/TransactionsPage.vue'
import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'
import LeaderboardPage from '@/pages/leaderboard/LeaderboardPage.vue'
import MyStatsPage from '@/pages/statistics/MyStatsPage.vue'
import GlobalStatisticsPage from '@/pages/statistics/GlobalStatisticsPage.vue'
import MyMatchesPage from '@/pages/matches/MyMatchesPage.vue'
import MyGamesPage from '@/pages/games/MyGamesPage.vue'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      meta: { requiresAuth: true },
    },
    {
      path: '/game/:mode/:variant', 
      name: 'GamePage',
      component: GamePage,
      props: true,  
    },
    {
      path: '/multiplayer/:mode/:variant',
      name: 'multiplayer',
      component: Multiplayer,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: TransactionsPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/register',
      component: RegisterPage
    },
    {
    path: '/multiplayer',
    name: 'multiplayerLobby',
    component: Lobby,
    meta: { requiresAuth: true}
    },
    {
      path: '/purchase',
      name: 'purchase',
      component: PurchasePage,
      meta: { requiresAuth: true}
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: LeaderboardPage,
      meta: { requiresAuth: false }, // enunciado diz leaderboard global
    },
    {
      path: '/my-stats',
      name: 'my-stats',
      component: MyStatsPage,
      meta: { requiresAuth: true }, // só para utilizador autenticado
    },
    {
      path: '/statistics/global',
      name: 'global-stats',
      component: GlobalStatisticsPage,
      meta: { requiresAuth: false }, // é global, pode ser pública
    },
    {
      path: '/testing',
      children: [
        {
          path: 'laravel',
          component: LaravelPage,
        },
        {
          path: 'websockets',
          component: WebsocketsPage,
        },
      ],
    },
    {
      path: '/my-matches',
      name: 'my-matches',
      component: MyMatchesPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/my-games',
      name: 'my-games',
      component: MyGamesPage,
      meta: { requiresAuth: true },
    },
    {
    path: '/admin',
    name: 'admin',
    component: AdminDashboardPage,
    meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'login' })
  }

  if (to.meta.requiresAdmin && authStore.user?.type !== 'A') {
    return next({ name: 'Home' })
  }

  next()
})

export default router
