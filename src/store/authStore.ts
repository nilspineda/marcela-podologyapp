import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email: string
}

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,

      signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) return { error }
        set({ user: { id: data.user.id, email: data.user.email! } })
        return { error: null }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      },

      checkAuth: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          set({ user: { id: user.id, email: user.email! }, loading: false })
        } else {
          set({ user: null, loading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)