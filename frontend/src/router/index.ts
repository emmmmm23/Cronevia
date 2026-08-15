import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  // Auth pages
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { guest: true },
  },

  // App pages (require auth)
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'trips',
        name: 'trips',
        component: () => import('@/pages/TripsPage.vue'),
      },
      {
        path: 'trips/new',
        name: 'trips.create',
        component: () => import('@/pages/TripCreatePage.vue'),
      },
      {
        path: 'trips/:id',
        name: 'trips.show',
        component: () => import('@/pages/TripDetailPage.vue'),
      },
      {
        path: 'trips/:id/edit',
        name: 'trips.edit',
        component: () => import('@/pages/TripCreatePage.vue'),
      },
      {
        path: 'journal',
        name: 'journal',
        component: () => import('@/pages/JournalPage.vue'),
      },
      {
        path: 'journal/new',
        name: 'journal.create',
        component: () => import('@/pages/JournalEditorPage.vue'),
      },
      {
        path: 'journal/:id',
        name: 'journal.edit',
        component: () => import('@/pages/JournalEditorPage.vue'),
      },
      {
        path: 'memories',
        name: 'memories',
        component: () => import('@/pages/MemoriesPage.vue'),
      },
      {
        path: 'memories/:id',
        name: 'memories.show',
        component: () => import('@/pages/MemoryDetailPage.vue'),
      },
      {
        path: 'map',
        name: 'map',
        component: () => import('@/pages/MapPage.vue'),
      },
      {
        path: 'take-me-back',
        name: 'takeback',
        component: () => import('@/pages/TakeBackPage.vue'),
      },
      {
        path: 'take-me-back/:tripId',
        name: 'takeback.trip',
        component: () => import('@/pages/TakeBackPage.vue'),
      },
      {
        path: 'capsules',
        name: 'capsules',
        component: () => import('@/pages/CapsulesPage.vue'),
      },
      {
        path: 'letters',
        name: 'letters',
        component: () => import('@/pages/FutureLettersPage.vue'),
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/pages/SearchPage.vue'),
      },
      {
        path: 'on-this-day',
        name: 'onthisday',
        component: () => import('@/pages/OnThisDayPage.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/ProfilePage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/SettingsPage.vue'),
      },
    ],
  },

  // Catch-all
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Try to fetch current user if not loaded yet
  if (!auth.initialized) {
    await auth.initialize()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
