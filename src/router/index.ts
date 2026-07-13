import { createRouter, createWebHashHistory } from 'vue-router'
import UnlockView from '@/views/UnlockView.vue'
import CreateView from '@/views/CreateView.vue'
import MainView from '@/views/MainView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/unlock' },
    { path: '/unlock', name: 'unlock', component: UnlockView },
    { path: '/create', name: 'create', component: CreateView },
    { path: '/vault', name: 'vault', component: MainView, meta: { requiresUnlock: true } }
  ]
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresUnlock && !auth.isUnlocked) {
    next('/unlock')
  } else {
    next()
  }
})

export default router
