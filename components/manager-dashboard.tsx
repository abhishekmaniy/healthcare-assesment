"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocation } from '@/contexts/location-context'
import { Users, Clock, MapPin, TrendingUp, Calendar, Settings, LogOut } from 'lucide-react'
import { Button, Card, Input, Table, Tabs, Tag, Form, Row, Col, Space, Typography } from 'antd'
import type { TableProps } from 'antd'

const { Title, Text } = Typography

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

export function ManagerDashboard() {
  const { user, logout } = useAuth()
  const { perimeter, setPerimeter } = useLocation()
  const [clockRecords] = useState<ClockRecord[]>(mockClockRecords)
  const [newPerimeter, setNewPerimeter] = useState({
    lat: perimeter.lat.toString(),
    lng: perimeter.lng.toString(),
    radius: (perimeter.radius / 1000).toString()
  })

  const activeWorkers = clockRecords.filter(r => !r.clockOut)

  const todayRecords = clockRecords.filter(r => {
    const today = new Date()
    return r.clockIn.toDateString() === today.toDateString()
  })

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
          <Button type="link" icon={<LogOut size={16} />} onClick={logout}>
            Logout
          </Button>
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
            key: '3',
            label: 'Location Settings',
            children: (
              <Card>
                <Title level={5}>Location Perimeter Settings</Title>
                <Text type="secondary">
                  Configure the allowed area where workers can clock in
                </Text>
                <Form layout="vertical" style={{ marginTop: 16 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Latitude">
                        <Input
                          value={newPerimeter.lat}
                          onChange={e => setNewPerimeter(prev => ({ ...prev, lat: e.target.value }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Longitude">
                        <Input
                          value={newPerimeter.lng}
                          onChange={e => setNewPerimeter(prev => ({ ...prev, lng: e.target.value }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Radius (km)">
                        <Input
                          value={newPerimeter.radius}
                          onChange={e => setNewPerimeter(prev => ({ ...prev, radius: e.target.value }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space>
                    <Button type="primary" icon={<Settings size={16} />} onClick={handleUpdatePerimeter}>
                      Update Perimeter
                    </Button>
                    <Text>
                      Current perimeter: {perimeter.radius / 1000} km from {perimeter.lat.toFixed(4)}, {perimeter.lng.toFixed(4)}
                    </Text>
                  </Space>
                </Form>
              </Card>
            )
          }
        ]}
      />
    </div>
  )
}
