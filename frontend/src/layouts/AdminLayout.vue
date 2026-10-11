<template>
  <div class="admin-layout">
    <!-- Mobile menu backdrop -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="mobile-backdrop"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="['admin-sidebar', { 'sidebar-open': sidebarOpen }]"
      @click="handleSidebarClick"
    >
      <div class="sidebar-header">
        <router-link to="/" class="sidebar-logo">
          <span class="logo-icon">🕰️</span>
          <span class="logo-text">Cronevia</span>
        </router-link>
        <span class="admin-badge">Admin</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          to="/admin"
          exact
          class="nav-item"
          active-class="active"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-label">Dashboard</span>
        </router-link>

        <div class="nav-section">
          <div class="section-label">User Management</div>
          <router-link
            to="/admin/users"
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">👥</span>
            <span class="nav-label">Users</span>
          </router-link>
        </div>

        <div class="nav-section">
          <div class="section-label">System</div>
          <router-link
            to="/admin/activity"
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">📋</span>
            <span class="nav-label">Activity Logs</span>
          </router-link>
          <router-link
            to="/admin/settings"
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Settings</span>
          </router-link>
          <router-link
            to="/admin/system"
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">🖥️</span>
            <span class="nav-label">System Status</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-profile" @click.stop="toggleProfileMenu">
          <div class="profile-avatar">
            <img
              v-if="authStore.user?.profile?.avatar_url"
              :src="authStore.user.profile.avatar_url"
              alt="Admin avatar"
            />
            <span v-else class="avatar-placeholder">
              {{ getInitials(authStore.user?.profile?.full_name) }}
            </span>
          </div>
          <div class="profile-info">
            <div class="profile-name">{{ authStore.user?.profile?.full_name }}</div>
            <div class="profile-role">👑 Super Admin</div>
          </div>
          <span class="profile-chevron">{{ profileMenuOpen ? '▲' : '▼' }}</span>
        </div>

        <!-- Profile dropdown -->
        <Transition name="slide-up">
          <div v-if="profileMenuOpen" class="profile-menu" @click.stop>
            <router-link to="/admin/profile" class="menu-item">
              <span class="menu-icon">👤</span>
              <span>My Profile</span>
            </router-link>
            <router-link to="/admin/security" class="menu-item">
              <span class="menu-icon">🔐</span>
              <span>Security</span>
            </router-link>
            <div class="menu-divider"></div>
            <router-link to="/admin/system" class="menu-item">
              <span class="menu-icon">🖥️</span>
              <span>System Status</span>
            </router-link>
            <router-link to="/admin/activity" class="menu-item">
              <span class="menu-icon">📋</span>
              <span>Activity Log</span>
            </router-link>
            <div class="menu-divider"></div>
            <router-link to="/" class="menu-item">
              <span class="menu-icon">🏠</span>
              <span>Back to Cronevia</span>
            </router-link>
            <button @click="handleLogout" class="menu-item logout">
              <span class="menu-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </Transition>
      </div>
    </aside>

    <!-- Main content -->
    <div class="admin-main">
      <header class="admin-header">
        <button
          class="mobile-menu-button"
          @click="sidebarOpen = !sidebarOpen"
          aria-label="Toggle menu"
        >
          <span class="hamburger-icon">☰</span>
        </button>
        <div class="header-title">
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="header-actions">
          <!-- Optional: Add breadcrumbs or actions here -->
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const sidebarOpen = ref(false)
const profileMenuOpen = ref(false)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/activity': 'Activity Logs',
    '/admin/settings': 'Settings',
    '/admin/system': 'System Status',
    '/admin/profile': 'My Profile',
    '/admin/security': 'Security',
  }
  return titles[route.path] || 'Admin'
})

function toggleProfileMenu() {
  profileMenuOpen.value = !profileMenuOpen.value
}

function handleSidebarClick() {
  // Close profile menu when clicking elsewhere in sidebar
  if (profileMenuOpen.value) {
    profileMenuOpen.value = false
  }
}

function getInitials(name?: string): string {
  if (!name) return 'SA'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// Close menus on route change
onMounted(() => {
  const unwatch = router.afterEach(() => {
    sidebarOpen.value = false
    profileMenuOpen.value = false
  })

  onUnmounted(() => {
    unwatch()
  })
})

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.admin-profile') && !target.closest('.profile-menu')) {
    profileMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ============================================================
   Admin Layout Styles
   ============================================================ */

.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f0;
}

/* ============================================================
   Sidebar
   ============================================================ */

.admin-sidebar {
  width: 280px;
  background: #2c2416;
  color: #f5f5f0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #3d3424;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid #3d3424;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: #f5f5f0;
  font-size: 1.25rem;
  font-weight: 600;
}

.logo-icon {
  font-size: 1.75rem;
}

.admin-badge {
  background: #8b4513;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Navigation */

.sidebar-nav {
  flex: 1;
  padding: 1.5rem 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 1.5rem;
}

.section-label {
  padding: 0.5rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #a0956f;
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: #d4c5a0;
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(139, 69, 19, 0.1);
  color: #f5f5f0;
}

.nav-item.active {
  background: rgba(139, 69, 19, 0.2);
  color: #f5f5f0;
  border-left-color: #8b4513;
}

.nav-icon {
  font-size: 1.25rem;
  width: 1.5rem;
  text-align: center;
}

.nav-label {
  font-size: 0.9375rem;
  font-weight: 500;
}

/* Sidebar Footer */

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #3d3424;
  position: relative;
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.admin-profile:hover {
  background: rgba(139, 69, 19, 0.1);
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #8b4513;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f5f5f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-role {
  font-size: 0.75rem;
  color: #d4c5a0;
}

.profile-chevron {
  font-size: 0.625rem;
  color: #a0956f;
}

/* Profile Menu */

.profile-menu {
  position: absolute;
  bottom: 100%;
  left: 1rem;
  right: 1rem;
  background: #3d3424;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #d4c5a0;
  text-decoration: none;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(139, 69, 19, 0.2);
  color: #f5f5f0;
}

.menu-item.logout {
  color: #ff6b6b;
}

.menu-item.logout:hover {
  background: rgba(255, 107, 107, 0.1);
}

.menu-icon {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
}

.menu-divider {
  height: 1px;
  background: rgba(212, 197, 160, 0.2);
  margin: 0.25rem 0;
}

/* ============================================================
   Main Content
   ============================================================ */

.admin-main {
  flex: 1;
  margin-left: 280px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-header {
  background: white;
  border-bottom: 1px solid #e5e5e0;
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 50;
}

.mobile-menu-button {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #2c2416;
  padding: 0.5rem;
}

.header-title h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c2416;
  margin: 0;
}

.header-actions {
  margin-left: auto;
}

.admin-content {
  flex: 1;
  padding: 2rem;
}

/* ============================================================
   Mobile Styles
   ============================================================ */

@media (max-width: 768px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar.sidebar-open {
    transform: translateX(0);
  }

  .admin-main {
    margin-left: 0;
  }

  .mobile-menu-button {
    display: block;
  }

  .mobile-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 90;
  }

  .admin-header {
    padding: 1rem 1.25rem;
  }

  .header-title h1 {
    font-size: 1.25rem;
  }

  .admin-content {
    padding: 1.25rem;
  }
}

/* ============================================================
   Transitions
   ============================================================ */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ============================================================
   Scrollbar Styling
   ============================================================ */

.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: #3d3424;
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: #4d4434;
}
</style>
