'use client'

import { LoginForm } from "@/components/login-form";
import { ManagerDashboard } from "@/components/manager-dashboard";
import { WorkerDashboard } from "@/components/worker-dashboard";
import { useAuth } from "@/contexts/auth-context";
import { Auth0Context } from "@auth0/auth0-react";
import { useUser } from "@auth0/nextjs-auth0/client";



export default function Home() {

  const { user, error, isLoading } = useUser()
  const { user: contextUser, isAuthenticated } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>{error.message}</div>

  if (user && contextUser) {
    return (contextUser.role === "ADMINISTRATIVE" ? <ManagerDashboard /> : <WorkerDashboard />)
  }

  if (!user || !contextUser || !isAuthenticated) {
    return <LoginForm />
  }

}
