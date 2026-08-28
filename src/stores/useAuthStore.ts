import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, UserRole } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<UserInfo | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const setAuth = (newToken: string, newUser: UserInfo) => {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const checkPermission = (code: string): boolean => {
    if (!user.value) return false
    return user.value.permissions.includes(code)
  }

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user.value) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.value.role)
  }

  const loadUserFromStorage = () => {
    const storedUser = localStorage.getItem('user')
    if (storedUser && token.value) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        console.error('Failed to load user from storage', e)
      }
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    logout,
    checkPermission,
    hasRole,
    loadUserFromStorage
  }
})
