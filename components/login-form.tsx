"use client";

import { useAuth } from "@/contexts/auth-context";
import { gql, useMutation } from "@apollo/client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Button, Select, message } from "antd";
import {
    Box,
    CardBody,
    CardHeader,
    Tab,
    Tabs
} from "grommet";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const REGISTER_USER = gql`
    mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
        user {
        id
        auth0Id
        name
        email
        picture
        role
        }
        isNewUser
        message
    }
    }
`;

const JOB_ROLES = [
    { label: "Doctor", value: "DOCTOR" },
    { label: "Nurse", value: "NURSE" },
    { label: "Paramedic", value: "PARAMEDIC" },
    { label: "Technician", value: "TECHNICIAN" },
    { label: "Support Staff", value: "SUPPORT_STAFF" },
    { label: "Pharmacist", value: "PHARMACIST" },
    { label: "Therapist", value: "THERAPIST" },
    { label: "Healthcare Assistant", value: "HCA" }
];

export function LoginForm() {
    const { setUser, setIsAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [jobRole, setJobRole] = useState<string>("");
    const { user } = useUser();
    const router = useRouter();

    const [registerUser] = useMutation(REGISTER_USER);

    const handleLogin = async () => {
        setIsLoading(true);

        if (!user) {
            window.location.href = "/api/auth/login";
            return;
        }

        try {
            console.log(jobRole)
            const res = await registerUser({
                variables: {
                    input: {
                        name: user.name || "Anonymous",
                        role: jobRole
                    }
                }
            });

            setUser(res.data.registerUser.user);
            setIsAuthenticated(true);

            message.success("Successfully registered!");

        } catch (err: any) {
            console.error("Error registering user:", err);
            setError(err.message);
            message.error(err.message);
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 p-6">
            <div className="w-full max-w-md bg-white shadow-lg rounded-2xl overflow-hidden">
                <CardHeader
                    className="bg-blue-600 text-white py-6 flex flex-col items-center text-center"
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
                                <Button onClick={handleLogin} type="primary" block loading={isLoading}>
                                    Log In
                                </Button>
                            </Box>
                        </Tab>

                        <Tab title="Register">
                            <Box pad="small" gap="medium">
                                <Select
                                    placeholder="Select your job role"
                                    options={JOB_ROLES}
                                    onChange={(value) => setJobRole(value)}
                                    style={{ width: "100%", marginBottom: "1rem" }}
                                />
                                <Button
                                    onClick={handleLogin}
                                    type="primary"
                                    block
                                    loading={isLoading}
                                    disabled={!jobRole}
                                >
                                    Register
                                </Button>
                            </Box>
                        </Tab>
                    </Tabs>

                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                        <a href="/api/auth/logout">Logout</a>
                    </div>
                </CardBody>
            </div>
        </div>
    );
}
