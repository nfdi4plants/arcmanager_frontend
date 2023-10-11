import { createRouter, createWebHistory } from 'vue-router'
import AppVue from '@/App.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'app',
      component: AppVue
    }
  ]
})

export default router
