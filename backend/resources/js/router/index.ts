import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [

  // ----------------------------------------------------------------
  // PUBLIC ROUTES — accessible without authentication
  // ----------------------------------------------------------------

  {
    path: '/',
    name: 'landing',
    component: () => import('../pages/LandingPage.vue'),
    meta: { public: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { public: true, guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: { public: true, guestOnly: true },
  },

  // ----------------------------------------------------------------
  // PROTECTED ROUTES — require authentication
  // ----------------------------------------------------------------

  {
    path: '/home',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('../pages/HomePage.vue') },
    ],
  },
  {
    path: '/trips',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'trips', component: () => import('../pages/TripsPage.vue') },
      { path: 'new', name: 'trips.create', component: () => import('../pages/TripCreatePage.vue') },
      { path: ':id', name: 'trips.show', component: () => import('../pages/TripDetailPage.vue') },
      { path: ':id/edit', name: 'trips.edit', component: () => import('../pages/TripCreatePage.vue') },
    ],
  },
  {
    path: '/journal',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'journal', component: () => import('../pages/JournalPage.vue') },
      { path: 'new', name: 'journal.create', component: () => import('../pages/JournalEditorPage.vue') },
      { path: ':id', name: 'journal.edit', component: () => import('../pages/JournalEditorPage.vue') },
    ],
  },
  {
    path: '/memories',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'memories', component: () => import('../pages/MemoriesPage.vue') },
      { path: ':id', name: 'memories.show', component: () => import('../pages/MemoryDetailPage.vue') },
    ],
  },
  {
    path: '/map',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'map', component: () => import('../pages/MapPage.vue') },
    ],
  },
  {
    path: '/take-me-back',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'takeback', component: () => import('../pages/TakeBackPage.vue') },
      { path: ':tripId', name: 'takeback.trip', component: () => import('../pages/TakeBackPage.vue') },
    ],
  },
  {
    path: '/capsules',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'capsules', component: () => import('../pages/CapsulesPage.vue') },
    ],
  },
  {
    path: '/letters',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'letters', component: () => import('../pages/FutureLettersPage.vue') },
    ],
  },
  {
    path: '/search',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'search', component: () => import('../pages/SearchPage.vue') },
    ],
  },
  {
    path: '/on-this-day',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'onthisday', component: () => import('../pages/OnThisDayPage.vue') },
    ],
  },
  {
    path: '/profile',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'profile', component: () => import('../pages/ProfilePage.vue') },
    ],
  },
  {
    path: '/settings',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'settings', component: () => import('../pages/SettingsPage.vue') },
    ],
  },

  // ----------------------------------------------------------------
  // SUPER ADMIN ROUTES — require super_admin role
  // ================================================================

  {
    path: '/super-admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'super_admin' },
    children: [
      { path: '', component: () => import('../pages/SuperAdmin/DashboardPage.vue') },
    ],
  },
  {
    path: '/super-admin/users',
    name: 'admin-users',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'super_admin' },
    children: [
      { path: '', component: () => import('../pages/SuperAdmin/UsersPage.vue') },
    ],
  },
  {
    path: '/super-admin/audit-logs',
    name: 'admin-audit-logs',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'super_admin' },
    children: [
      { path: '', component: () => import('../pages/SuperAdmin/AuditLogsPage.vue') },
    ],
  },
  {
    path: '/super-admin/system-health',
    name: 'admin-system-health',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'super_admin' },
    children: [
      { path: '', component: () => import('../pages/SuperAdmin/SystemHealthPage.vue') },
    ],
  },

  // ----------------------------------------------------------------
  // CATCH-ALL — redirect guests to landing, authenticated to home
  // ----------------------------------------------------------------
  { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
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

  // Run the session probe exactly once per app load
  if (!auth.initialized) {
    await auth.initialize()
  }

  // Redirect unauthenticated users away from protected routes
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Only add ?redirect= for non-root protected paths
    const redirect = to.fullPath !== '/' ? to.fullPath : undefined
    return { name: 'login', ...(redirect ? { query: { redirect } } : {}) }
  }

  // Redirect authenticated users away from guest-only pages (login / register)
  if (to.meta.guestOnly && auth.isAuthenticated) {
    // Redirect based on role to appropriate home
    if (auth.user?.role === 'super_admin') {
      return { name: 'admin-dashboard' }
    }
    return { name: 'home' }
  }



  // Role-based route protection
  if (to.meta.requiresRole && auth.isAuthenticated) {
    if (auth.user?.role !== to.meta.requiresRole) {
      // User doesn't have required role
      if (auth.user?.role === 'super_admin') {
        // Super admin trying to access user route → go to admin dashboard
        return { name: 'admin-dashboard' }
      }
      // Normal user trying to access admin route → go to home
      return { name: 'home' }
    }
  }
})

export default router

