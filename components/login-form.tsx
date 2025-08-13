"use client";

import { useAuth } from "@/contexts/auth-context";
import { gql, useLazyQuery, useMutation } from "@apollo/client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Button, Select, message, Card, Typography, Tabs, Space } from "antd";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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

const LOGIN_USER = gql`
  query LoginUser($input: LoginUserInput!) {
    loginUser(input: $input) {
      user {
        id
        auth0Id
        name
        email
        picture
        role
      }
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
  const [jobRole, setJobRole] = useState<string>("");
  const { user, isLoading: isLoadingUser } = useUser();
  const router = useRouter();

  const [registerUser] = useMutation(REGISTER_USER);
  const [loginUser] = useLazyQuery(LOGIN_USER);

  const handleRegister = async () => {
    setIsLoading(true);

    if (!user) {
      window.location.href = "/api/auth/login";
      return;
    }

    try {
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
      message.error(err.message);
    }

    setIsLoading(false);
  };

  const handleLogin = async () => {
    setIsLoading(true);

    if (!user) {
      window.location.href = "/api/auth/login";
      return;
    }

    try {
      const res = await loginUser({
        variables: {
          input: { email: user.email }
        }
      });

      setUser(res.data.loginUser.user);
      setIsAuthenticated(true);
      message.success("Successfully logged in!");
    } catch (err: any) {
      console.error("Error logging in:", err);
      message.error(err.message);
    }

    setIsLoading(false);
  };

  const loadingState = isLoading || isLoadingUser;

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "40px 16px" }}>
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}
          bodyStyle={{ padding: 24 }}
        >
          <Space
            direction="vertical"
            align="center"
            style={{ width: "100%", marginBottom: 24 }}
          >
            <div
              style={{
                padding: 12,
                background: "#e6f4ff",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Heart size={28} color="#1677ff" />
            </div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Healthcare Clock-In
            </Title>
            <Text type="secondary" style={{ textAlign: "center" }}>
              Professional time tracking for healthcare workers
            </Text>
          </Space>

          <Tabs defaultActiveKey="login" centered>
            <TabPane tab="Login" key="login">
              <Button
                type="primary"
                block
                size="large"
                onClick={handleLogin}
                loading={loadingState}
              >
                Log In
              </Button>
            </TabPane>

            <TabPane tab="Register" key="register">
              <Select
                placeholder="Select your job role"
                options={JOB_ROLES}
                onChange={(value) => setJobRole(value)}
                style={{ width: "100%", marginBottom: 16 }}
              />
              <Button
                type="primary"
                block
                size="large"
                onClick={handleRegister}
                loading={loadingState}
                disabled={!jobRole}
              >
                Register
              </Button>
            </TabPane>
          </Tabs>

          
        </Card>
      </div>
    </div>
  );
}
