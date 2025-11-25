import HomePage from '@/pages/home/HomePage.vue'
import LoginPage from '@/pages/login/LoginPage.vue'
import PurchasePage from '@/pages/purchase/PurchasePage.vue'
import RegisterPage from '@/pages/register/RegisterPage.vue'
import LaravelPage from '@/pages/testing/LaravelPage.vue'
import WebsocketsPage from '@/pages/testing/WebsocketsPage.vue'
import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomePage,
    },
    {
      path: '/login',
      component: LoginPage,
    },
    {
      path: '/register',
      component: RegisterPage
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
