import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUserProfileStore } from '../store/userProfileStore'
import type { UserProfile } from '../store/userProfileStore'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: { id: string; email: string; role?: string } | null
  login: (email: string, password: string) => Promise<void>
  signup: (
    email: string,
    password: string,
    profileData: {
      fullName: string
      phoneNumber: string
      katyNumber: string
      grade: string
      parentEmail: string
      parentPhone: string
      address: string
    }
  ) => Promise<void>
  logout: () => Promise<void>
  fetchUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string; role?: string } | null>(null)
  const { setProfile, clearProfile } = useUserProfileStore()

  // Fetch user profile from Supabase
  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.log('No session found')
        clearProfile()
        return
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        throw error
      }

      if (profile) {
        console.log('Profile fetched successfully:', profile.email)
        const userProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          phoneNumber: profile.phone_number,
          katyNumber: profile.katy_number,
          grade: profile.grade,
          parentEmail: profile.parent_email,
          parentPhone: profile.parent_phone,
          address: profile.address,
          role: profile.role,
        }
        setProfile(userProfile)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      clearProfile()
    }
  }

  // Check auth state on mount
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkAuth = async () => {
      try {
        console.log('Starting auth check...')
        console.log('Supabase URL:', supabase.supabaseUrl)
        console.log('Supabase Auth:', supabase.auth)

        // Set a timeout to prevent hanging forever
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error('Auth check timed out after 5 seconds')
            setIsLoading(false)
            setIsAuthenticated(false)
            clearProfile()
          }
        }, 5000)

        // Check if client is initialized
        if (!supabase.supabaseUrl || !supabase.auth) {
          throw new Error('Supabase client not properly initialized')
        }

        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        clearTimeout(timeoutId)

        if (error) {
          console.error('Get session error:', error)
          setIsAuthenticated(false)
          setUser(null)
          clearProfile()
          setIsLoading(false)
          return
        }

        if (session) {
          console.log('Auth session found:', session.user.email)
          setUser({ id: session.user.id, email: session.user.email })
          setIsAuthenticated(true)
          await fetchUserProfile()
        } else {
          console.log('No auth session found')
          setIsAuthenticated(false)
          setUser(null)
          clearProfile()
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Auth check error:', err)
        setIsAuthenticated(false)
        clearProfile()
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId)
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email! })
        setIsAuthenticated(true)
        await fetchUserProfile()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      throw new Error(message)
    }
  }

  const signup = async (
    email: string,
    password: string,
    profileData: {
      fullName: string
      phoneNumber: string
      katyNumber: string
      grade: string
      parentEmail: string
      parentPhone: string
      address: string
    }
  ) => {
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      const userId = signUpData.user?.id

      if (userId) {
        // Wait for trigger to create profile row
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Update profile with additional details
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: profileData.fullName,
            phone_number: profileData.phoneNumber,
            katy_number: profileData.katyNumber || null,
            grade: profileData.grade ? parseInt(profileData.grade) : null,
            parent_email: profileData.parentEmail,
            parent_phone: profileData.parentPhone,
            address: profileData.address,
          })
          .eq('id', userId)

        if (updateError) throw updateError

        // Fetch and set the complete profile
        await fetchUserProfile()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      throw new Error(message)
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setIsAuthenticated(false)
      clearProfile()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      throw new Error(message)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        signup,
        logout,
        fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
