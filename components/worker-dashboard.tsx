"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { gql, useQuery } from "@apollo/client";
import client from "@/lib/apolloClient";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "@/contexts/location-context";
import { Shift } from "@/types";
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
    Spin,
    message,
} from "antd";

const MapSelector = dynamic(() => import("./map"), { ssr: false });

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* =========================
   GraphQL
========================= */

const GET_WORKER_ZONE_FOR_CURRENT_USER = gql`
  query GetWorkerZoneForCurrentUser {
    workerZoneForCurrentUser {
      role
      label
      workerZone {
        id
        lat
        lng
        radius   # NOTE: backend returns radius in KM
      }
    }
  }
`;

const GET_SHIFTS_FOR_CURRENT_USER = gql`
  query GetShiftsForCurrentUser {
    shiftsForCurrentUser {
      id
      clockIn
      clockOut
      clockInLat
      clockInLng
      clockOutLat
      clockOutLng
      clockInNote
      clockOutNote
      userId
    }
  }
`;

const CLOCK_IN_MUTATION = gql`
  mutation ClockIn($lat: Float!, $lng: Float!, $note: String) {
    clockIn(clockInLat: $lat, clockInLng: $lng, clockInNote: $note) {
      id
      clockIn
      clockOut
      clockInLat
      clockInLng
      clockOutLat
      clockOutLng
      clockInNote
      clockOutNote
      userId
    }
  }
`;

const CLOCK_OUT_MUTATION = gql`
  mutation ClockOut($lat: Float!, $lng: Float!, $note: String) {
    clockOut(clockOutLat: $lat, clockOutLng: $lng, clockOutNote: $note) {
      id
      clockIn
      clockOut
      clockInLat
      clockInLng
      clockOutLat
      clockOutLng
      clockInNote
      clockOutNote
      userId
    }
  }
`;

/* =========================
   Helpers
========================= */

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
}

function parseShiftTimestamps<S extends { clockIn: any; clockOut?: any | null }>(s: S) {
    return {
        ...s,
        clockIn: new Date(Number(s.clockIn)),
        clockOut: s.clockOut ? new Date(Number(s.clockOut)) : undefined,
    };
}

export function WorkerDashboard() {
    const { user } = useAuth();
    const userKey = user?.auth0Id ?? user?.id ?? "anon";

    const { currentLocation, requestLocation } = useLocation();

    const [isClockedIn, setIsClockedIn] = useState(false);
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
    const [clockNote, setClockNote] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [isInsideZone, setIsInsideZone] = useState(false);

    // --- queries (avoid name collisions)
    const {
        data: zoneDataResp,
        loading: zoneLoading,
        error: zoneError,
    } = useQuery(GET_WORKER_ZONE_FOR_CURRENT_USER, { fetchPolicy: "cache-first" });

    const {
        data: shiftsDataResp,
        loading: shiftsLoading,
        error: shiftsError,
    } = useQuery(GET_SHIFTS_FOR_CURRENT_USER, {
        skip: !userKey,
        fetchPolicy: "network-only",
    });

    const zone = zoneDataResp?.workerZoneForCurrentUser?.workerZone ?? null;

    // initial location request with unmount guard (prevents AntD CSS-in-JS warning)
    useEffect(() => {
        let mounted = true;
        (async () => {
            const ok = await requestLocation();
            if (mounted && !ok) setLocationError("Please allow location access to use Clock In/Out.");
        })();
        return () => {
            mounted = false;
        };
    }, [requestLocation]);

    // compute inside-zone whenever loc/zone changes
    useEffect(() => {
        if (!zone || !currentLocation?.lat || !currentLocation?.lng) return;

        const distance = getDistanceInMeters(
            currentLocation.lat,
            currentLocation.lng,
            zone.lat,
            zone.lng
        );

        // zone.radius is in KM -> convert to meters for comparison
        const radiusMeters = (zone.radius ?? 0) * 1000;
        setIsInsideZone(distance <= radiusMeters);
    }, [zone, currentLocation?.lat, currentLocation?.lng]);

    // bootstrap shifts from query -> set current shift + history + localStorage
    useEffect(() => {
        if (!shiftsDataResp?.shiftsForCurrentUser) return;

        const parsed: Shift[] = shiftsDataResp.shiftsForCurrentUser.map((s: any) =>
            parseShiftTimestamps(s)
        );

        const active = parsed.find((s) => !s.clockOut) ?? null;
        const history = parsed.filter((s) => !!s.clockOut);

        setCurrentShift(active);
        setIsClockedIn(!!active);
        setShiftHistory(history);

        if (active) localStorage.setItem(`active_shift_${userKey}`, JSON.stringify(active));
        localStorage.setItem(`shift_history_${userKey}`, JSON.stringify(history));
    }, [shiftsDataResp, userKey]);

    // also try restoring from localStorage on mount (before network)
    useEffect(() => {
        const activeRaw = localStorage.getItem(`active_shift_${userKey}`);
        if (activeRaw) {
            const parsed = parseShiftTimestamps(JSON.parse(activeRaw));
            setCurrentShift(parsed as Shift);
            setIsClockedIn(true);
        }
        const historyRaw = localStorage.getItem(`shift_history_${userKey}`);
        if (historyRaw) {
            const arr = JSON.parse(historyRaw).map(parseShiftTimestamps);
            setShiftHistory(arr);
        }
    }, [userKey]);

    const handleClockIn = async () => {
        try {
            setIsActionLoading(true);
            setLocationError("");

            const ok = await requestLocation();
            if (!ok) {
                setLocationError("Unable to get your location. Please enable location services.");
                return;
            }
            if (!zone) {
                message.error("Work zone not configured for your role.");
                return;
            }
            if (!isInsideZone) {
                message.error(`You are outside the allowed area. Move within ${zone.radius} km.`);
                return;
            }

            const { data } = await client.mutate({
                mutation: CLOCK_IN_MUTATION,
                variables: {
                    lat: currentLocation?.lat,
                    lng: currentLocation?.lng,
                    note: clockNote.trim() || null,
                },
            });

            const newShift = parseShiftTimestamps<Shift>(data.clockIn);
            setCurrentShift(newShift);
            setIsClockedIn(true);
            setClockNote("");
            localStorage.setItem(`active_shift_${userKey}`, JSON.stringify(newShift));
            message.success("Clocked in successfully");
        } catch (err: any) {
            console.error(err);
            message.error(err?.message || "Failed to clock in");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!currentShift) return;

        try {
            setIsActionLoading(true);
            await requestLocation();

            const { data } = await client.mutate({
                mutation: CLOCK_OUT_MUTATION,
                variables: {
                    lat: currentLocation?.lat,
                    lng: currentLocation?.lng,
                    note: clockNote.trim() || null,
                },
            });

            const completed = parseShiftTimestamps<Shift>(data.clockOut);

            // prepend to history
            const updatedHistory = [completed, ...shiftHistory];
            setShiftHistory(updatedHistory);
            localStorage.setItem(`shift_history_${userKey}`, JSON.stringify(updatedHistory));

            // clear active
            setCurrentShift(null);
            setIsClockedIn(false);
            setClockNote("");
            localStorage.removeItem(`active_shift_${userKey}`);
            message.success("Clocked out successfully");
        } catch (err: any) {
            console.error(err);
            message.error(err?.message || "Failed to clock out");
        } finally {
            setIsActionLoading(false);
        }
    };

    const formatDuration = (start: Date, end?: Date) => {
        const endTime = end ?? new Date();
        const duration = endTime.getTime() - start.getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const currentShiftDuration = useMemo(() => {
        if (!currentShift) return "0h 0m";
        return formatDuration(currentShift.clockIn);
    }, [currentShift]);

    const todayHours = useMemo(() => {
        const todayStr = new Date().toDateString();
        const finishedToday = shiftHistory.filter(
            (s) => s.clockIn.toDateString() === todayStr && !!s.clockOut
        );

        const finishedMinutes = finishedToday.reduce((acc, s) => {
            if (!s.clockOut) return acc;
            return acc + (s.clockOut.getTime() - s.clockIn.getTime()) / (1000 * 60);
        }, 0);

        const activeMinutes =
            isClockedIn && currentShift
                ? (Date.now() - currentShift.clockIn.getTime()) / (1000 * 60)
                : 0;

        return Math.floor(((finishedMinutes + activeMinutes) / 60) * 10) / 10;
    }, [shiftHistory, isClockedIn, currentShift]);

    const globalLoading = zoneLoading || shiftsLoading;

    if (globalLoading) {
        return (
            <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Space direction="vertical" align="center">
                    <Spin size="large" />
                    <Text type="secondary">Loading your dashboard…</Text>
                </Space>
            </div>
        );
    }

    if (zoneError) {
        return (
            <Alert
                type="error"
                message="Failed to load worker zone"
                description={zoneError.message}
                showIcon
            />
        );
    }

    if (shiftsError) {
        return (
            <Alert
                type="error"
                message="Failed to load your shifts"
                description={shiftsError.message}
                showIcon
            />
        );
    }

    return (
        <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
                {/* Header */}
                <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
                    <Space>
                        <Clock style={{ color: "green" }} />
                        <div>
                            <Title level={3} style={{ margin: 0 }}>
                                Worker Dashboard
                            </Title>
                            <Text type="secondary">Welcome, {user?.name}</Text>
                        </div>
                    </Space>
                    <a href="/api/auth/logout">
                        <Button icon={<LogOut size={16} />}>Logout</Button>
                    </a>
                </Row>

                {/* Status Cards */}
                <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                    <Col xs={24} md={8}>
                        <Card>
                            <Text type="secondary">Current Status</Text>
                            <Title level={4} style={{ margin: "8px 0" }}>
                                {isClockedIn ? "Clocked In" : "Clocked Out"}
                            </Title>
                            {isClockedIn ? <CheckCircle color="green" /> : <XCircle color="gray" />}
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card>
                            <Text type="secondary">Current Shift</Text>
                            <Title level={4} style={{ margin: "8px 0" }}>
                                {currentShiftDuration}
                            </Title>
                            <Timer color="blue" />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card>
                            <Text type="secondary">Today's Hours</Text>
                            <Title level={4} style={{ margin: "8px 0" }}>
                                {todayHours}h
                            </Title>
                            <Calendar color="purple" />
                        </Card>
                    </Col>
                </Row>

                {/* Map */}
                <Card style={{ marginBottom: 32 }}>
                    <MapSelector
                        initialLat={zone?.lat ?? 0}
                        initialLng={zone?.lng ?? 0}
                        radius={zone?.radius ?? 0}
                        onLocationChange={() => { }}
                    />
                </Card>

                {/* Location Status */}
                <Card style={{ marginBottom: 24 }}>
                    <Space>
                        <MapPin />
                        <div>
                            <Text strong>Location Status: </Text>
                            {currentLocation ? (
                                <Badge
                                    status={isInsideZone ? "success" : "error"}
                                    text={isInsideZone ? "Within Perimeter" : "Outside Perimeter"}
                                />
                            ) : (
                                <Badge status="default" text="Location Unknown" />
                            )}
                            {currentLocation && (
                                <Paragraph type="secondary" style={{ margin: 0 }}>
                                    {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                                </Paragraph>
                            )}
                        </div>
                    </Space>
                </Card>

                {/* Errors */}
                {locationError && (
                    <Alert
                        type="error"
                        message={locationError}
                        icon={<AlertTriangle size={16} />}
                        style={{ marginBottom: 24 }}
                        showIcon
                    />
                )}

                {/* Note + Actions */}
                <Card style={{ marginBottom: 24 }}>
                    <TextArea
                        rows={3}
                        placeholder={isClockedIn ? "Clock Out Note (Optional)" : "Clock In Note (Optional)"}
                        value={clockNote}
                        onChange={(e) => setClockNote(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />
                    <Button
                        type={isClockedIn ? "primary" : "default"}
                        danger={isClockedIn}
                        block
                        size="large"
                        loading={isActionLoading}
                        onClick={isClockedIn ? handleClockOut : handleClockIn}
                        disabled={!isClockedIn && !isInsideZone}
                    >
                        {isClockedIn ? "Clock Out" : "Clock In"}
                    </Button>
                    {!isInsideZone && !isClockedIn && zone && (
                        <Paragraph type="secondary" style={{ textAlign: "center", marginTop: 8 }}>
                            You must be within {zone.radius} km of the workplace to clock in
                        </Paragraph>
                    )}
                </Card>

                {/* Shift History */}
                <Card title="Recent Shifts">
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
                                render: (record: Shift) =>
                                    `${new Date(record.clockIn).toLocaleTimeString()} - ${record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : "In Progress"
                                    }`,
                            },
                            {
                                title: "Duration",
                                render: (record: Shift) =>
                                    record.clockOut ? formatDuration(record.clockIn, record.clockOut) : "Active",
                            },
                            {
                                title: "Notes",
                                render: (record: Shift) => (
                                    <>
                                        {record.clockInNote && <div>In: {record.clockInNote}</div>}
                                        {record.clockOutNote && <div>Out: {record.clockOutNote}</div>}
                                    </>
                                ),
                            },
                        ]}
                    />
                </Card>
            </div>
        </div>

    );
}

