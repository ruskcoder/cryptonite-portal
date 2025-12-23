import { create } from 'zustand'

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  phoneNumber: string | null
  katyNumber: string | null
  grade: number | null
  parentEmail: string | null
  parentPhone: string | null
  address: string | null
  role: string
}

interface UserProfileStore {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearProfile: () => void
}

export const useUserProfileStore = create<UserProfileStore>((set) => ({
  profile: null,
  isLoading: false,
  error: null,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearProfile: () => set({ profile: null, error: null }),
}))
