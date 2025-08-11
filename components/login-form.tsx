"use client"

import { useAuth } from "@/contexts/auth-context"
import { gql, useMutation, useQuery } from "@apollo/client"
import { useUser } from "@auth0/nextjs-auth0/client"
import { Button } from "antd"
import axios from "axios"
import {
    Box,
    CardBody,
    CardHeader,
    Tab,
    Tabs
} from "grommet"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      user {
        id
        auth0Id
        name
        email
        picture
      }
      isNewUser
      message
    }
  }
`;


export function LoginForm() {
    const { login, register } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [role, setRole] = useState<string>("")
    const router = useRouter()
    const { user } = useUser()



    const [registerUser, { data, error: mutationError, loading }] = useMutation(REGISTER_USER)


    const handleLogin = async () => {



        setIsLoading(true)
        if (!user) {
            window.location.href = '/api/auth/login'
            return
        }

        try {
            const res = await registerUser({
                variables: {
                    input: {
                        name: user.name || "Anonymous",
                        additionalData: "some extra info" 
                    }
                }
            })
            console.log("Registered:", res.data.registerUser)

        } catch (err: any) {
            console.error("Error fetching user:", err.response?.data || err.message);
            setError(err.message)
        }
        setError("")



        setIsLoading(false)
    }



    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 p-6">
            <div className="w-full max-w-md bg-white shadow-lg rounded-2xl overflow-hidden">
                <CardHeader
                    className="bg-blue-600 text-white py-6 border-none flex flex-col items-center justify-center text-center"
                    style={{ borderBottom: "none" }}
                >
                    <div className="p-3 bg-white rounded-full shadow-md mb-3">
                        <Heart className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold">Healthcare Clock-In</h2>
                    <p className="text-blue-100 text-sm">
                        Professional time tracking for healthcare workers
                    </p>
                </CardHeader>


                <CardBody className="p-6">
                    <Tabs>
                        <Tab title="Login">
                            <Box pad="small">

                                <Button onClick={() => handleLogin()} type="primary">Log In</Button>

                            </Box>
                        </Tab>

                        <Tab title="Register">
                            <Box pad="small">

                                <Button onClick={() => handleLogin()} type="primary">Register</Button>
                            </Box>
                        </Tab>
                    </Tabs>
                    <a href="/api/auth/logout">Logout</a>
                </CardBody>
            </div>
        </div>

    )
}
