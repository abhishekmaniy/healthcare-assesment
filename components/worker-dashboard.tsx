"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "@/contexts/location-context";
import {
    Clock,
    MapPin,
    LogOut,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    Timer,
} from "lucide-react";
import {
    Card,
    Badge,
    Input,
    Typography,
    Alert,
    Button,
    Table,
    Space,
    Row,
    Col,
} from "antd";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface WorkerClockRecord {
    id: string;
    clockIn: Date;
    clockOut?: Date;
    clockInLocation: { lat: number; lng: number };
    clockOutLocation?: { lat: number; lng: number };
    clockInNote?: string;
    clockOutNote?: string;
}

export function WorkerDashboard() {
    const { user, logout } = useAuth();
    const { currentLocation, isWithinPerimeter, perimeter, requestLocation } =
        useLocation();
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [currentShift, setCurrentShift] = useState<WorkerClockRecord | null>(
        null
    );
    const [clockNote, setClockNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [shiftHistory, setShiftHistory] = useState<WorkerClockRecord[]>([]);

    useEffect(() => {
        const activeShift = localStorage.getItem(`active_shift_${user?.id}`);
        if (activeShift) {
            const shift = JSON.parse(activeShift);
            setCurrentShift(shift);
            setIsClockedIn(true);
        }

        const history = localStorage.getItem(`shift_history_${user?.id}`);
        if (history) {
            setShiftHistory(
                JSON.parse(history).map((shift: any) => ({
                    ...shift,
                    clockIn: new Date(shift.clockIn),
                    clockOut: shift.clockOut ? new Date(shift.clockOut) : undefined,
                }))
            );
        }
    }, [user?.id]);



    const handleClockIn = async () => {
        setIsLoading(true);
        setLocationError("");

        const locationObtained = await requestLocation();
        if (!locationObtained) {
            setLocationError(
                "Unable to get your location. Please enable location services."
            );
            setIsLoading(false);
            return;
        }

        if (!isWithinPerimeter) {
            setLocationError(
                `You are outside the allowed area. Please move within ${perimeter.radius / 1000
                }km of the workplace.`
            );
            setIsLoading(false);
            return;
        }

        const newShift: WorkerClockRecord = {
            id: Date.now().toString(),
            clockIn: new Date(),
            clockInLocation: currentLocation!,
            clockInNote: clockNote.trim() || undefined,
        };

        setCurrentShift(newShift);
        setIsClockedIn(true);
        setClockNote("");
        localStorage.setItem(
            `active_shift_${user?.id}`,
            JSON.stringify(newShift)
        );
        setIsLoading(false);
    };

    const handleClockOut = async () => {
        if (!currentShift) return;

        setIsLoading(true);
        const locationObtained = await requestLocation();

        const completedShift: WorkerClockRecord = {
            ...currentShift,
            clockOut: new Date(),
            clockOutLocation: locationObtained ? currentLocation! : undefined,
            clockOutNote: clockNote.trim() || undefined,
        };

        const updatedHistory = [completedShift, ...shiftHistory];
        setShiftHistory(updatedHistory);
        localStorage.setItem(
            `shift_history_${user?.id}`,
            JSON.stringify(updatedHistory)
        );

        setCurrentShift(null);
        setIsClockedIn(false);
        setClockNote("");
        localStorage.removeItem(`active_shift_${user?.id}`);
        setIsLoading(false);
    };

    const formatDuration = (start: Date, end?: Date) => {
        const endTime = end || new Date();
        const duration = endTime.getTime() - start.getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor(
            (duration % (1000 * 60 * 60)) / (1000 * 60)
        );
        return `${hours}h ${minutes}m`;
    };

    const getCurrentShiftDuration = () => {
        if (!currentShift) return "0h 0m";
        return formatDuration(currentShift.clockIn);
    };

    const getTodayHours = () => {
        const today = new Date().toDateString();
        const todayShifts = shiftHistory.filter(
            (shift) =>
                shift.clockIn.toDateString() === today && shift.clockOut
        );

        const totalMinutes = todayShifts.reduce((acc, shift) => {
            if (shift.clockOut) {
                return (
                    acc +
                    (shift.clockOut.getTime() - shift.clockIn.getTime()) /
                    (1000 * 60)
                );
            }
            return acc;
        }, 0);

        if (isClockedIn && currentShift) {
            const currentMinutes =
                (Date.now() - currentShift.clockIn.getTime()) / (1000 * 60);
            return (
                Math.floor(((totalMinutes + currentMinutes) / 60) * 10) / 10
            );
        }

        return Math.floor((totalMinutes / 60) * 10) / 10;
    };

    return (
        <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh" }}>
            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Space>
                    <Clock style={{ color: "green" }} />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Worker Dashboard
                        </Title>
                        <Text type="secondary">Welcome, {user?.name}</Text>
                    </div>
                </Space>
                <Button icon={<LogOut size={16} />} onClick={logout}>
                    Logout
                </Button>
            </Row>

            {/* Status Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <Card>
                        <Text type="secondary">Current Status</Text>
                        <Title level={4} style={{ margin: "8px 0" }}>
                            {isClockedIn ? "Clocked In" : "Clocked Out"}
                        </Title>
                        {isClockedIn ? (
                            <CheckCircle color="green" />
                        ) : (
                            <XCircle color="gray" />
                        )}
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card>
                        <Text type="secondary">Current Shift</Text>
                        <Title level={4} style={{ margin: "8px 0" }}>
                            {getCurrentShiftDuration()}
                        </Title>
                        <Timer color="blue" />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card>
                        <Text type="secondary">Today's Hours</Text>
                        <Title level={4} style={{ margin: "8px 0" }}>
                            {getTodayHours()}h
                        </Title>
                        <Calendar color="purple" />
                    </Card>
                </Col>
            </Row>

            {/* Location Status */}
            <Card style={{ marginBottom: 24 }}>
                <Space>
                    <MapPin />
                    <div>
                        <Text strong>Location Status: </Text>
                        {currentLocation ? (
                            <Badge
                                status={isWithinPerimeter ? "success" : "error"}
                                text={
                                    isWithinPerimeter
                                        ? "Within Perimeter"
                                        : "Outside Perimeter"
                                }
                            />
                        ) : (
                            <Badge status="default" text="Location Unknown" />
                        )}
                        {currentLocation && (
                            <Paragraph type="secondary" style={{ margin: 0 }}>
                                {currentLocation.lat.toFixed(4)},{" "}
                                {currentLocation.lng.toFixed(4)}
                            </Paragraph>
                        )}
                    </div>
                </Space>
            </Card>

            {/* Clock In/Out */}
            {locationError && (
                <Alert
                    type="error"
                    message={locationError}
                    icon={<AlertTriangle size={16} />}
                    style={{ marginBottom: 16 }}
                />
            )}

            <TextArea
                rows={3}
                placeholder={
                    isClockedIn
                        ? "Clock Out Note (Optional)"
                        : "Clock In Note (Optional)"
                }
                value={clockNote}
                onChange={(e) => setClockNote(e.target.value)}
                style={{ marginBottom: 16 }}
            />

            <Button
                type={isClockedIn ? "primary" : "default"}
                danger={isClockedIn}
                block
                size="large"
                loading={isLoading}
                onClick={isClockedIn ? handleClockOut : handleClockIn}
                disabled={!isClockedIn && !isWithinPerimeter}
            >
                {isClockedIn ? "Clock Out" : "Clock In"}
            </Button>

            {!isWithinPerimeter && !isClockedIn && (
                <Paragraph type="secondary" style={{ textAlign: "center" }}>
                    You must be within {perimeter.radius / 1000}km of the workplace
                    to clock in
                </Paragraph>
            )}

            {/* Shift History Table */}
            <Card title="Recent Shifts" style={{ marginTop: 24 }}>
                <Table
                    rowKey="id"
                    dataSource={shiftHistory}
                    pagination={{ pageSize: 5 }}
                    columns={[
                        {
                            title: "Date",
                            dataIndex: "clockIn",
                            render: (date: Date) => new Date(date).toLocaleDateString(),
                        },
                        {
                            title: "Time",
                            render: (record: WorkerClockRecord) =>
                                `${new Date(
                                    record.clockIn
                                ).toLocaleTimeString()} - ${record.clockOut
                                    ? new Date(record.clockOut).toLocaleTimeString()
                                    : "In Progress"
                                }`,
                        },
                        {
                            title: "Duration",
                            render: (record: WorkerClockRecord) =>
                                record.clockOut
                                    ? formatDuration(record.clockIn, record.clockOut)
                                    : "Active",
                        },
                        {
                            title: "Notes",
                            render: (record: WorkerClockRecord) => (
                                <>
                                    {record.clockInNote && <div>In: {record.clockInNote}</div>}
                                    {record.clockOutNote && (
                                        <div>Out: {record.clockOutNote}</div>
                                    )}
                                </>
                            ),
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
