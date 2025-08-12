"use client"

import { User } from '@/types'
import React, { createContext, useContext, useState, useEffect, Dispatch, SetStateAction } from 'react'
import { gql, useQuery } from "@apollo/client"
import { useUser } from '@auth0/nextjs-auth0/client'


interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  setUser: Dispatch<SetStateAction<User | null>>
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ME = gql`
  query Me {
    me {
      id
      auth0Id
      name
      email
      picture
      role
      createdAt
      updatedAt
    }
  }
`;



export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [error, setError] = useState<string | null>(null);

  const { data, loading: meLoading, refetch } = useQuery(ME, {
    skip: !auth0User,
    fetchPolicy: "network-only",
    onError: () => {
      
    }
  });

  useEffect(() => {
    if (!auth0Loading && auth0User) {
      // If me query returned user, store it
      if (data?.me) {
        setUser(data.me);
        setIsAuthenticated(true)
      }

    }
  }, [auth0User, auth0Loading, data]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, setUser , setIsAuthenticated }}>
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
