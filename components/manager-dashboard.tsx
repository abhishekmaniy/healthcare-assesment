"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Users, Clock, MapPin, TrendingUp, Calendar, LogOut } from "lucide-react";
import { Button, Card, Input, Table, Tabs, Tag, Typography, Modal, Spin, Row, Col } from "antd";
import type { TableProps } from "antd";
import MapSelector from "./map";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title as ChartTitle,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ChartTitle);

const { Title, Text } = Typography;

interface StaffLocation {
  id: string;
  name: string;
  role: string;
  lat: number;
  lng: number;
  radius: number; // meters
}

interface ShiftRecord {
  id: string;
  clockIn: string;    // ISO or ms string
  clockOut?: string;  // ISO or ms string | null
  clockInLat: number;
  clockInLng: number;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
    picture?: string | null;
  };
}

const GET_STAFF_LOCATIONS = gql`
  query GetStaffLocations {
    staffLocations {
      role
      label
      workerZone {
        id
        lat
        lng
        radius
      }
    }
  }
`;

const UPDATE_STAFF_LOCATION = gql`
  mutation UpdateStaffLocation($id: ID!, $lat: Float!, $lng: Float!, $radius: Float!) {
    updateStaffLocation(id: $id, lat: $lat, lng: $lng, radius: $radius) {
      role
      label
      workerZone {
        id
        lat
        lng
        radius
      }
    }
  }
`;

// Uses your ShiftForAdmin -> allShiftsForAdmin response with embedded user
const GET_ALL_QUERY = gql`
  query {
    allShiftsForAdmin {
      id
      clockIn
      clockOut
      clockInLat
      clockInLng
      clockOutLat
      clockOutLng
      clockInNote
      clockOutNote
      user {
        id
        name
        role
        email
        picture
      }
    }
  }
`;

function toDate(v?: string | null) {
  return v ? new Date(v) : null;
}

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function dayKey(d: Date) {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function lastNDates(n: number): Date[] {
  const arr: Date[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    arr.push(d);
  }
  return arr;
}

export function ManagerDashboard() {
  const { user } = useAuth();

  const [selectedStaff, setSelectedStaff] = useState<StaffLocation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalStaffData, setOriginalStaffData] = useState<StaffLocation | null>(null);

  // Queries
  const {
    data: locationData,
    loading: locationsLoading,
    error: locationsError,
    refetch: refetchLocations,
  } = useQuery(GET_STAFF_LOCATIONS);

  const { data, loading, error } = useQuery(GET_ALL_QUERY);

  const [updateStaffLocation, { loading: updateLoading }] = useMutation(UPDATE_STAFF_LOCATION, {
    onCompleted: () => {
      setIsModalOpen(false);
      refetchLocations();
    },
  });

  // ---- Transform shifts from API (real data) ----
  const clockRecords: ShiftRecord[] = useMemo(() => {
    return data?.allShiftsForAdmin ?? [];
  }, [data]);

  // ---- Cards (real data) ----
  const activeWorkers = useMemo(() => clockRecords.filter((r) => !r.clockOut), [clockRecords]);

  const todayRecords = useMemo(() => {
    const todayStr = new Date().toDateString();
    return clockRecords.filter((r) => new Date(r.clockIn).toDateString() === todayStr);
  }, [clockRecords]);

  const avgHoursToday = useMemo(() => {
    if (todayRecords.length === 0) return 0;
    const total = todayRecords.reduce((acc, r) => {
      const start = new Date(r.clockIn);
      const end = r.clockOut ? new Date(r.clockOut) : new Date();
      return acc + hoursBetween(start, end);
    }, 0);
    return total / todayRecords.length;
  }, [todayRecords]);

  const totalHours = useMemo(() => {
    // Completed shifts total hours (all time)
    return clockRecords.reduce((acc, r) => {
      if (!r.clockOut) return acc;
      const start = new Date(r.clockIn);
      const end = new Date(r.clockOut);
      return acc + hoursBetween(start, end);
    }, 0);
  }, [clockRecords]);

  // ---- Tables (real data) ----
  const formatDuration = (startISO: string, endISO?: string) => {
    const start = new Date(startISO);
    const end = endISO ? new Date(endISO) : new Date();
    const dur = end.getTime() - start.getTime();
    const h = Math.floor(dur / (1000 * 60 * 60));
    const m = Math.floor((dur % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  const activeColumns: TableProps<ShiftRecord>["columns"] = [
    { title: "Worker", dataIndex: ["user", "name"], key: "workerName" },
    { title: "Clock In Time", key: "clockIn", render: (_, r) => new Date(r.clockIn).toLocaleTimeString() },
    { title: "Duration", key: "duration", render: (_, r) => formatDuration(r.clockIn) },
    {
      title: "Location",
      key: "location",
      render: (_, r) => (
        <span>
          <MapPin className="inline-block mr-1" size={14} />
          {r.clockInLat.toFixed(4)}, {r.clockInLng.toFixed(4)}
        </span>
      ),
    },
    { title: "Note", key: "note", render: (_, r) => r.clockInNote || "-" },
    { title: "Status", key: "status", render: () => <Tag color="green">Active</Tag> },
  ];

  const historyColumns: TableProps<ShiftRecord>["columns"] = [
    { title: "Worker", dataIndex: ["user", "name"], key: "workerName" },
    {
      title: "Clock In",
      key: "clockIn",
      render: (_, r) => (
        <>
          <div>{new Date(r.clockIn).toLocaleString()}</div>
          <Text type="secondary">
            {r.clockInLat.toFixed(4)}, {r.clockInLng.toFixed(4)}
          </Text>
        </>
      ),
    },
    {
      title: "Clock Out",
      key: "clockOut",
      render: (_, r) =>
        r.clockOut ? (
          <>
            <div>{new Date(r.clockOut).toLocaleString()}</div>
            <Text type="secondary">
              {r.clockOutLat?.toFixed(4)}, {r.clockOutLng?.toFixed(4)}
            </Text>
          </>
        ) : (
          <Tag color="blue">Still Active</Tag>
        ),
    },
    { title: "Duration", key: "duration", render: (_, r) => formatDuration(r.clockIn, r.clockOut) },
    {
      title: "Notes",
      key: "notes",
      render: (_, r) => (
        <>
          {r.clockInNote && (
            <div>
              <Text strong>In: </Text>
              {r.clockInNote}
            </div>
          )}
          {r.clockOutNote && (
            <div>
              <Text strong>Out: </Text>
              {r.clockOutNote}
            </div>
          )}
        </>
      ),
    },
  ];

  // ---- Charts (all from real data) ----
  // Use last 7 days window
  const last7 = useMemo(() => lastNDates(7), []);
  const last7Keys = useMemo(() => last7.map(dayKey), [last7]);
  const last7Labels = useMemo(() => last7.map(dayLabel), [last7]);

  // Build per-day (YYYY-MM-DD) -> Map<userId, totalHoursThatDay>
  const perDayUserHours = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    last7Keys.forEach((k) => (map[k] = {}));

    clockRecords.forEach((r) => {
      const start = toDate(r.clockIn);
      if (!start) return;
      const end = toDate(r.clockOut) ?? new Date();
      const k = dayKey(start);
      if (!last7Keys.includes(k)) return; // count only last 7 days by clock-in date

      const hrs = Math.max(0, hoursBetween(start, end));
      const uid = r.user.id;
      map[k][uid] = (map[k][uid] ?? 0) + hrs;
    });

    return map;
  }, [clockRecords, last7Keys]);

  // i) Avg hours people are spending clocked in each day
  const avgHoursPerDayDataset = useMemo(() => {
    return last7Keys.map((k) => {
      const userHours = Object.values(perDayUserHours[k] || {});
      if (userHours.length === 0) return 0;
      const sum = userHours.reduce((a, b) => a + b, 0);
      return sum / userHours.length;
    });
  }, [perDayUserHours, last7Keys]);

  // ii) Number of people clocking in each day (unique users)
  const uniqueClockersPerDayDataset = useMemo(() => {
    return last7Keys.map((k) => Object.keys(perDayUserHours[k] || {}).length);
  }, [perDayUserHours, last7Keys]);

  // iii) Total Hours clocked in per staff over the last 1 week
  const totalHoursPerStaff = useMemo(() => {
    const totals: Record<string, { name: string; hours: number }> = {};
    clockRecords.forEach((r) => {
      const start = toDate(r.clockIn);
      if (!start) return;
      const k = dayKey(start);
      if (!last7Keys.includes(k)) return;

      const end = toDate(r.clockOut) ?? new Date();
      const hrs = Math.max(0, hoursBetween(start, end));

      const uid = r.user.id;
      const name = r.user.name || r.user.email || uid;
      if (!totals[uid]) totals[uid] = { name, hours: 0 };
      totals[uid].hours += hrs;
    });

    // Sort desc and take top 10 to keep chart readable
    const sorted = Object.values(totals).sort((a, b) => b.hours - a.hours).slice(0, 10);
    return sorted;
  }, [clockRecords, last7Keys]);

  const avgHoursChartData = useMemo(
    () => ({
      labels: last7Labels,
      datasets: [
        {
          label: "Avg Hours / Day",
          data: avgHoursPerDayDataset,
          backgroundColor: "#3b82f6",
        },
      ],
    }),
    [last7Labels, avgHoursPerDayDataset]
  );

  const clockInsChartData = useMemo(
    () => ({
      labels: last7Labels,
      datasets: [
        {
          label: "People Clocked In",
          data: uniqueClockersPerDayDataset,
          backgroundColor: "#16a34a",
        },
      ],
    }),
    [last7Labels, uniqueClockersPerDayDataset]
  );

  const totalHoursChartData = useMemo(
    () => ({
      labels: totalHoursPerStaff.map((s) => s.name),
      datasets: [
        {
          label: "Total Hours (Last 7 Days)",
          data: totalHoursPerStaff.map((s) => Number(s.hours.toFixed(2))),
          backgroundColor: "#f59e0b",
        },
      ],
    }),
    [totalHoursPerStaff]
  );

  // ---- Location settings ----
  const isChanged = useMemo(() => {
    if (!selectedStaff || !originalStaffData) return false;
    return (
      selectedStaff.lat !== originalStaffData.lat ||
      selectedStaff.lng !== originalStaffData.lng ||
      selectedStaff.radius !== originalStaffData.radius
    );
  }, [selectedStaff, originalStaffData]);

  const handleRowClick = (record: StaffLocation) => {
    setSelectedStaff({ ...record });
    setOriginalStaffData({ ...record });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedStaff) return;
    updateStaffLocation({
      variables: {
        id: selectedStaff.id,
        lat: selectedStaff.lat,
        lng: selectedStaff.lng,
        radius: selectedStaff.radius, // meters
      },
    });
  };

  const locationColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Role", dataIndex: "role", key: "role" },
    { title: "Latitude", dataIndex: "lat", key: "lat", render: (lat: number) => lat.toFixed(4) },
    { title: "Longitude", dataIndex: "lng", key: "lng", render: (lng: number) => lng.toFixed(4) },
    { title: "Radius (m)", dataIndex: "radius", key: "radius", render: (radius: number) => radius.toFixed(1) },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users color="#2563eb" size={32} />
            <div>
              <h2 className="m-0 font-semibold text-gray-500">Manager Dashboard</h2>
              <p className="m-0 text-gray-500">Welcome back, {user?.name}</p>
            </div>
          </div>
          <a href="/api/auth/logout">
            <Button type="primary" icon={<LogOut size={16} />} danger>
              Logout
            </Button>
          </a>
        </div>

        {/* Stats */}
        <Row gutter={16} className="mb-6">
          <Col xs={24} md={6}>
            <Card className="text-center rounded-xl">
              <p className="text-gray-500 text-sm">Active Workers</p>
              <h2 className="text-2xl font-semibold">{activeWorkers.length}</h2>
              <Users color="#2563eb" />
            </Card>
          </Col>

        <Col xs={24} md={6}>
            <Card className="text-center rounded-xl">
              <p className="text-gray-500 text-sm">Today's Check-ins</p>
              <h2 className="text-2xl font-semibold">{todayRecords.length}</h2>
              <Calendar color="#16a34a" />
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card className="text-center rounded-xl">
              <p className="text-gray-500 text-sm">Avg Hours Today</p>
              <h2 className="text-2xl font-semibold">{avgHoursToday.toFixed(1)}h</h2>
              <Clock color="#f59e0b" />
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card className="text-center rounded-xl">
              <p className="text-gray-500 text-sm">Total Hours</p>
              <h2 className="text-2xl font-semibold">{totalHours.toFixed(1)}h</h2>
              <TrendingUp color="#7c3aed" />
            </Card>
          </Col>
        </Row>

        {/* Tabs */}
        <Card className="rounded-xl">
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "Active Workers",
                children: (
                  <Table
                    columns={activeColumns}
                    dataSource={activeWorkers}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                  />
                ),
              },
              {
                key: "2",
                label: "Clock History",
                children: (
                  <Table
                    columns={historyColumns}
                    dataSource={clockRecords}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                  />
                ),
              },
              {
                key: "3",
                label: "Hours Per Staff",
                children: (
                  <Card className="p-4">
                    <Title level={4}>Hours Per Staff</Title>

                    {/* Avg hours per day (last 7 days) */}
                    <div className="my-6" style={{ height: 220 }}>
                      <Bar
                        data={avgHoursChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "top" } },
                        }}
                      />
                    </div>

                    {/* People clocking in each day (last 7 days) */}
                    <div className="my-6" style={{ height: 220 }}>
                      <Line
                        data={clockInsChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "top" } },
                        }}
                      />
                    </div>

                    {/* Total hours per staff (last 7 days, top 10) */}
                    <div className="my-6" style={{ height: 220 }}>
                      <Bar
                        data={totalHoursChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "top" } },
                        }}
                      />
                    </div>
                  </Card>
                ),
              },
              {
                key: "4",
                label: "Location Settings",
                children: (
                  <Card>
                    <Title level={5}>Staff Location Settings</Title>
                    {locationsLoading ? (
                      <div className="text-center py-5">
                        <Spin size="large" />
                      </div>
                    ) : locationsError ? (
                      <Text type="danger">Failed to load staff locations</Text>
                    ) : (
                      <Table
                        columns={locationColumns}
                        dataSource={
                          (locationData?.staffLocations || []).map((loc: any) => ({
                            id: loc.workerZone?.id || loc.role,
                            name: loc.label || loc.role,
                            role: loc.role,
                            lat: loc.workerZone?.lat || 0,
                            lng: loc.workerZone?.lng || 0,
                            radius: loc.workerZone?.radius || 0, // meters
                          })) || []
                        }
                        rowKey="id"
                        onRow={(record: StaffLocation) => ({
                          onClick: () => handleRowClick(record),
                        })}
                        className="mt-4"
                      />
                    )}

                    <Modal
                      title={`Edit Location for ${selectedStaff?.name}`}
                      open={isModalOpen}
                      onCancel={() => setIsModalOpen(false)}
                      footer={null}
                      width={800}
                    >
                      {selectedStaff && (
                        <div className="flex flex-col h-[500px]">
                          <MapSelector
                            initialLat={selectedStaff.lat}
                            initialLng={selectedStaff.lng}
                            radius={selectedStaff.radius} // meters
                            onLocationChange={(lat, lng) =>
                              setSelectedStaff((prev) => (prev ? { ...prev, lat, lng } : null))
                            }
                          />
                          <div className="flex mt-4 gap-2 items-center">
                            <Input
                              value={selectedStaff.lat}
                              onChange={(e) =>
                                setSelectedStaff((prev) =>
                                  prev ? { ...prev, lat: parseFloat(e.target.value) || 0 } : null
                                )
                              }
                              placeholder="Latitude"
                            />
                            <Input
                              value={selectedStaff.lng}
                              onChange={(e) =>
                                setSelectedStaff((prev) =>
                                  prev ? { ...prev, lng: parseFloat(e.target.value) || 0 } : null
                                )
                              }
                              placeholder="Longitude"
                            />
                            <Input
                              value={selectedStaff.radius}
                              onChange={(e) =>
                                setSelectedStaff((prev) =>
                                  prev ? { ...prev, radius: parseFloat(e.target.value) || 0 } : null
                                )
                              }
                              placeholder="Radius (m)"
                            />
                            <Button
                              type="primary"
                              onClick={handleSave}
                              disabled={!isChanged || updateLoading}
                              loading={updateLoading}
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      )}
                    </Modal>
                  </Card>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
