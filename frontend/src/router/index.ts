import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Extend route meta type
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guest?: boolean
    requiresAdmin?: boolean
  }
}

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
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/ResetPasswordPage.vue'),
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
      {path:'memories/new',name:'memories.create',component:()=>import('@/pages/MemoryDetailPage.vue')},
      {path:'memories/:id/edit',name:'memories.edit',component:()=>import('@/pages/MemoryDetailPage.vue')},
      {
        path: 'memories/:id',
        name: 'memories.show',
        component: () => import('@/pages/MemoryDetailPage.vue'),
      },
      {
        path: 'map',
        name: 'map',
        redirect: '/trackers',
      },
      { path: 'trackers', name: 'trackers', component: () => import('@/pages/TrackersPage.vue') },
      { path: 'trackers/:id', name: 'trackers.show', component: () => import('@/pages/TrackersPage.vue') },
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
      // Super Admin routes
      {
        path: 'admin',
        component: () => import('@/layouts/AdminLayout.vue'),
        meta: { requiresAuth: true, requiresAdmin: true },
        children: [
          {
            path: '',
            name: 'admin.dashboard',
            component: () => import('@/pages/admin/AdminDashboardPage.vue'),
          },
          {
            path: 'users',
            name: 'admin.users',
            component: () => import('@/pages/admin/AdminUsersPage.vue'),
          },
          {
            path: 'users/:id',
            name: 'admin.users.show',
            component: () => import('@/pages/admin/AdminUserDetailPage.vue'),
          },
          {
            path: 'activity',
            name: 'admin.activity',
            component: () => import('@/pages/admin/AdminActivityPage.vue'),
          },
          {
            path: 'settings',
            name: 'admin.settings',
            component: () => import('@/pages/admin/AdminSettingsPage.vue'),
          },
          {
            path: 'system',
            name: 'admin.system',
            component: () => import('@/pages/admin/AdminSystemPage.vue'),
          },
          {
            path: 'profile',
            name: 'admin.profile',
            component: () => import('@/pages/admin/AdminProfilePage.vue'),
          },
          {
            path: 'security',
            name: 'admin.security',
            component: () => import('@/pages/admin/AdminSecurityPage.vue'),
          },
        ],
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

  // Initialize auth state on first navigation
  if (!auth.initialized) {
    await auth.initialize()
  }

  // Protected routes - require authentication
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Guest routes - redirect authenticated users away
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'home' }
  }

  // Admin routes - require super_admin role
  if (to.meta.requiresAdmin) {
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (!auth.isSuperAdmin) {
      // Redirect non-admin users to home
      return { name: 'home' }
    }
  }

  // Check account status for authenticated users
  if (auth.isAuthenticated && auth.profile && !auth.isAccountActive) {
    // Account is suspended or inactive
    if (to.name !== 'login') {
      await auth.logout()
      return { 
        name: 'login', 
        query: { 
          error: 'account_suspended',
          message: 'Your account has been suspended. Please contact support.' 
        } 
      }
    }
  }
})

export default router
