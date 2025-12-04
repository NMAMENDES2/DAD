import GamePage from '@/pages/game/GamePage.vue'
import HomePage from '@/pages/home/HomePage.vue'
import LoginPage from '@/pages/login/LoginPage.vue'
import MultiplayerTest from '@/pages/multiplayer/MultiplayerTest.vue'
import Profile from '@/pages/profile/Profile.vue'
import PurchasePage from '@/pages/purchase/PurchasePage.vue'
import RegisterPage from '@/pages/register/RegisterPage.vue'
import LaravelPage from '@/pages/testing/LaravelPage.vue'
import WebsocketsPage from '@/pages/testing/WebsocketsPage.vue'
import TransactionsPage from '@/pages/Transactions/TransactionsPage.vue'
import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'

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
      beforeEnter: (to, from, next) => {
        const authStore = useAuthStore();
        if(authStore.isLoggedIn){
          next();
        }else{
          next('/login');
        }
      }
    },
    {
      path: '/game/:mode/:variant', 
      name: 'GamePage',
      component: GamePage,
      props: true,  
    },
    {
      path: '/login',
      component: LoginPage,
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: TransactionsPage,
      beforeEnter: (to, from, next) => {
        const authStore = useAuthStore();
        if(authStore.isLoggedIn){
          next();
        } else {
          next('/login');
        }
      }
    },
    {
      path: '/register',
      component: RegisterPage
    },
    {
    path: '/testMultiplayer',
    name: 'testMultiplayer',
    component: MultiplayerTest,
    },
    {
      path: '/purchase',
      component: PurchasePage,
      beforeEnter: (to, from, next) => {
        const authStore = useAuthStore();
        if(authStore.isLoggedIn){
          next();
        } else {
          next({name: 'Login'});
        }
      }
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
  ],
})

export default router
