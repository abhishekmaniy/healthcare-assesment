"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'manager' | 'worker'
  department?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const mockUsers: (User & { password: string })[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'manager@hospital.com',
    role: 'manager',
    department: 'Emergency',
    password: 'manager123'
  },
  {
    id: '2',
    name: 'Nurse Mike Chen',
    email: 'worker@hospital.com',
    role: 'worker',
    department: 'ICU',
    password: 'worker123'
  }
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('healthcare_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      setIsAuthenticated(true)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password)
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword)
      setIsAuthenticated(true)
      localStorage.setItem('healthcare_user', JSON.stringify(userWithoutPassword))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('healthcare_user')
  }

  const register = async (userData: Omit<User, 'id'> & { password: string }): Promise<boolean> => {
    // In a real app, this would make an API call
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department
    }
    
    setUser(newUser)
    setIsAuthenticated(true)
    localStorage.setItem('healthcare_user', JSON.stringify(newUser))
    return true
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
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
