"use client"

import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocation } from '@/contexts/location-context'
import { Users, Clock, MapPin, TrendingUp, Calendar, Settings, LogOut } from 'lucide-react'
import { Button, Card, Input, Table, Tabs, Tag, Form, Row, Col, Space, Typography, Modal, Spin } from 'antd'
import type { TableProps } from 'antd'
import MapSelector from './map'
import { gql, useMutation, useQuery } from '@apollo/client'

const { Title, Text } = Typography


interface StaffLocation {
  id: string;
  name: string;
  role: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

const mockStaffLocations: StaffLocation[] = [
  { id: "1", name: "Nurse Mike Chen", role: "NURSE", lat: 40.7128, lng: -74.0060, radius: 2000 },
  { id: "2", name: "Dr. Emily Rodriguez", role: "DOCTOR", lat: 40.7150, lng: -74.0020, radius: 1500 },
];


interface ClockRecord {
  id: string
  workerId: string
  workerName: string
  clockIn: Date
  clockOut?: Date
  clockInLocation: { lat: number; lng: number }
  clockOutLocation?: { lat: number; lng: number }
  clockInNote?: string
  clockOutNote?: string
}

const mockClockRecords: ClockRecord[] = [
  {
    id: '1',
    workerId: '2',
    workerName: 'Nurse Mike Chen',
    clockIn: new Date(Date.now() - 4 * 60 * 60 * 1000),
    clockInLocation: { lat: 40.7128, lng: -74.0060 },
    clockInNote: 'Starting ICU shift'
  },
  {
    id: '2',
    workerId: '3',
    workerName: 'Dr. Emily Rodriguez',
    clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000),
    clockOut: new Date(Date.now() - 30 * 60 * 1000),
    clockInLocation: { lat: 40.7128, lng: -74.0060 },
    clockOutLocation: { lat: 40.7128, lng: -74.0060 },
    clockInNote: 'Emergency shift',
    clockOutNote: 'Shift completed'
  }
]

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

export function ManagerDashboard() {
  const { user } = useAuth()
  const { perimeter, setPerimeter } = useLocation()
  const [clockRecords] = useState<ClockRecord[]>(mockClockRecords)
  const [newPerimeter, setNewPerimeter] = useState({
    lat: perimeter.lat.toString(),
    lng: perimeter.lng.toString(),
    radius: (perimeter.radius / 1000).toString()
  })
  const [selectedStaff, setSelectedStaff] = useState<StaffLocation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalStaffData, setOriginalStaffData] = useState<StaffLocation | null>(null);


  const {
    data: locationData,
    loading: locationsLoading,
    error: locationsError,
    refetch: refetchLocations,
  } = useQuery(GET_STAFF_LOCATIONS);


  const [updateStaffLocation, { loading: updateLoading }] = useMutation(UPDATE_STAFF_LOCATION, {
    onCompleted: () => {
      setIsModalOpen(false);
      refetchLocations();
    },
  });

  const activeWorkers = clockRecords.filter(r => !r.clockOut)

  const todayRecords = clockRecords.filter(r => {
    const today = new Date()
    return r.clockIn.toDateString() === today.toDateString()
  })

  const isChanged = useMemo(() => {
    if (!selectedStaff || !originalStaffData) return false;
    return (
      selectedStaff.lat !== originalStaffData.lat ||
      selectedStaff.lng !== originalStaffData.lng ||
      selectedStaff.radius !== originalStaffData.radius
    );
  }, [selectedStaff, originalStaffData]);

  const avgHoursToday =
    todayRecords.length > 0
      ? todayRecords.reduce((acc, r) => {
        const hours = r.clockOut
          ? (r.clockOut.getTime() - r.clockIn.getTime()) / (1000 * 60 * 60)
          : (Date.now() - r.clockIn.getTime()) / (1000 * 60 * 60)
        return acc + hours
      }, 0) / todayRecords.length
      : 0



  const handleUpdatePerimeter = () => {
    setPerimeter({
      lat: parseFloat(newPerimeter.lat),
      lng: parseFloat(newPerimeter.lng),
      radius: parseFloat(newPerimeter.radius) * 1000
    })
  }

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const duration = endTime.getTime() - start.getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const activeColumns: TableProps<ClockRecord>['columns'] = [
    { title: 'Worker', dataIndex: 'workerName', key: 'workerName' },
    { title: 'Clock In Time', key: 'clockIn', render: (_, r) => r.clockIn.toLocaleTimeString() },
    { title: 'Duration', key: 'duration', render: (_, r) => formatDuration(r.clockIn) },
    {
      title: 'Location',
      key: 'location',
      render: (_, r) => (
        <span>
          <MapPin className="inline-block mr-1" size={14} />
          {r.clockInLocation.lat.toFixed(4)}, {r.clockInLocation.lng.toFixed(4)}
        </span>
      )
    },
    { title: 'Note', key: 'note', render: (_, r) => r.clockInNote || '-' },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Active</Tag>
    }
  ]

  const historyColumns: TableProps<ClockRecord>['columns'] = [
    { title: 'Worker', dataIndex: 'workerName', key: 'workerName' },
    {
      title: 'Clock In',
      key: 'clockIn',
      render: (_, r) => (
        <>
          <div>{r.clockIn.toLocaleString()}</div>
          <Text type="secondary">
            {r.clockInLocation.lat.toFixed(4)}, {r.clockInLocation.lng.toFixed(4)}
          </Text>
        </>
      )
    },
    {
      title: 'Clock Out',
      key: 'clockOut',
      render: (_, r) =>
        r.clockOut ? (
          <>
            <div>{r.clockOut.toLocaleString()}</div>
            <Text type="secondary">
              {r.clockOutLocation?.lat.toFixed(4)}, {r.clockOutLocation?.lng.toFixed(4)}
            </Text>
          </>
        ) : (
          <Tag color="blue">Still Active</Tag>
        )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, r) =>
        r.clockOut ? formatDuration(r.clockIn, r.clockOut) : formatDuration(r.clockIn)
    },
    {
      title: 'Notes',
      key: 'notes',
      render: (_, r) => (
        <>
          {r.clockInNote && (
            <div>
              <Text strong>In: </Text>{r.clockInNote}
            </div>
          )}
          {r.clockOutNote && (
            <div>
              <Text strong>Out: </Text>{r.clockOutNote}
            </div>
          )}
        </>
      )
    }
  ]


  const handleRowClick = (record: StaffLocation) => {
    setSelectedStaff({ ...record });
    setOriginalStaffData({ ...record });
    setIsModalOpen(true);
  };


  const handleMapClick = (lat: number, lng: number) => {
    setSelectedStaff(prev => prev ? { ...prev, lat, lng } : null);
  };

  const handleUpdateRadius = (radiusKm: string) => {
    setSelectedStaff(prev => prev ? { ...prev, radius: parseFloat(radiusKm) * 1000 } : null);
  };

  const handleSave = () => {
    if (!selectedStaff) return;
    updateStaffLocation({
      variables: {
        id: selectedStaff.id,
        lat: selectedStaff.lat,
        lng: selectedStaff.lng,
        radius: selectedStaff.radius,
      },
    });
  };

  const locationColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Role", dataIndex: "role", key: "role" },
    {
      title: "Latitude",
      dataIndex: "lat",
      key: "lat",
      render: (lat: number) => lat.toFixed(4),
    },
    {
      title: "Longitude",
      dataIndex: "lng",
      key: "lng",
      render: (lng: number) => lng.toFixed(4),
    },
    {
      title: "Radius (km)",
      dataIndex: "radius",
      key: "radius",
      render: (radius: number) => (radius / 1000).toFixed(1),
    },
  ];



  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Users color="#1677ff" />
            <div>
              <Title level={4} style={{ margin: 0 }}>Manager Dashboard</Title>
              <Text type="secondary">Welcome back, {user?.name}</Text>
            </div>
          </Space>
          <a href="/api/auth/logout">
            <Button type="link" icon={<LogOut size={16} />} >
              Logout
            </Button>
          </a>
        </Space>
      </Card>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Card>
            <Text>Active Workers</Text>
            <Title level={3}>{activeWorkers.length}</Title>
            <Users color="#1677ff" />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text>Today's Check-ins</Text>
            <Title level={3}>{todayRecords.length}</Title>
            <Calendar color="#52c41a" />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text>Avg Hours Today</Text>
            <Title level={3}>{avgHoursToday.toFixed(1)}h</Title>
            <Clock color="#fa8c16" />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text>Total Hours</Text>
            <Title level={3}>
              {clockRecords.reduce((acc, r) => {
                const h = r.clockOut
                  ? (r.clockOut.getTime() - r.clockIn.getTime()) / (1000 * 60 * 60)
                  : 0
                return acc + h
              }, 0).toFixed(1)}h
            </Title>
            <TrendingUp color="#722ed1" />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Active Workers',
            children: (
              <Card>
                <Title level={5}>Currently Clocked In</Title>
                <Text type="secondary">Workers who are currently on shift</Text>
                <Table
                  columns={activeColumns}
                  dataSource={activeWorkers}
                  rowKey="id"
                  style={{ marginTop: 16 }}
                  pagination={false}
                />
              </Card>
            )
          },
          {
            key: '2',
            label: 'Clock History',
            children: (
              <Card>
                <Title level={5}>Clock In/Out History</Title>
                <Table
                  columns={historyColumns}
                  dataSource={clockRecords}
                  rowKey="id"
                  style={{ marginTop: 16 }}
                  pagination={false}
                />
              </Card>
            )
          },
          {
            key: "3",
            label: "Location Settings",
            children: (
              <Card>
                <Title level={5}>Staff Location Settings</Title>
                <Text type="secondary">
                  Set allowed perimeter for each staff member
                </Text>

                {locationsLoading ? (
                  <div style={{ textAlign: "center", padding: 20 }}>
                    <Spin size="large" />
                  </div>
                ) : locationsError ? (
                  <Text type="danger">Failed to load staff locations</Text>
                ) : (
                  <Table
                    columns={locationColumns}
                    dataSource={locationData?.staffLocations?.map((loc: any) => ({
                      id: loc.workerZone?.id || loc.role,
                      name: loc.label || loc.role,
                      role: loc.role,
                      lat: loc.workerZone?.lat || 0,
                      lng: loc.workerZone?.lng || 0,
                      radius: loc.workerZone?.radius || 0,
                    })) || []}
                    rowKey="id"
                    onRow={(record: StaffLocation) => ({
                      onClick: () => handleRowClick(record),
                    })}
                    style={{ marginTop: 16 }}
                  />
                )}

                {/* Modal */}
                <Modal
                  title={`Edit Location for ${selectedStaff?.name}`}
                  open={isModalOpen}
                  onCancel={() => setIsModalOpen(false)}
                  footer={null}
                  width={800}
                >
                  {selectedStaff && (
                    <div style={{ display: "flex", flexDirection: "column", height: "500px" }}>
                      <MapSelector
                        initialLat={selectedStaff.lat}
                        initialLng={selectedStaff.lng}
                        radius={selectedStaff.radius}
                        onLocationChange={(lat, lng) => {
                          setSelectedStaff((prev) => (prev ? { ...prev, lat, lng } : null));
                        }}
                      />

                      <div style={{ display: "flex", alignItems: "center", marginTop: 16, gap: "8px" }}>
                        <Input
                          style={{ width: "150px" }}
                          value={selectedStaff.lat.toString()}
                          onChange={(e) =>
                            setSelectedStaff((prev) =>
                              prev ? { ...prev, lat: parseFloat(e.target.value) || 0 } : null
                            )
                          }
                          placeholder="Latitude"
                        />

                        <Input
                          style={{ width: "150px" }}
                          value={selectedStaff.lng.toString()}
                          onChange={(e) =>
                            setSelectedStaff((prev) =>
                              prev ? { ...prev, lng: parseFloat(e.target.value) || 0 } : null
                            )
                          }
                          placeholder="Longitude"
                        />

                        <Input
                          style={{ width: "150px" }}
                          value={(selectedStaff.radius / 1000).toString()}
                          onChange={(e) =>
                            setSelectedStaff((prev) =>
                              prev ? { ...prev, radius: (parseFloat(e.target.value) || 0) * 1000 } : null
                            )
                          }
                          placeholder="Radius"
                          suffix="km"
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
    </div>
  )
}
