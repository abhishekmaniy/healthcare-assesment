export type Role =
  | 'DOCTOR'
  | 'NURSE'
  | 'PARAMEDIC'
  | 'TECHNICIAN'
  | 'SUPPORT_STAFF'
  | 'PHARMACIST'
  | 'THERAPIST'
  | 'ADMINISTRATIVE'
  | 'HCA';

export type User = {
  id: string;
  auth0Id: string;
  name: string;
  email: string;
  role: Role;
  picture: string | null;
  createdAt: Date;
  updatedAt: Date;
  shifts?: Shift[];
};

export type Shift = {
  id: string;
  clockIn: Date;
  clockOut: Date | null;
  clockInLat: number;
  clockInLng: number;
  clockOutLat: number | null;
  clockOutLng: number | null;
  clockInNote: string | null;
  clockOutNote: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
};

/**
 * WorkerType:
 * - Represents a type of worker (e.g., DOCTOR, NURSE)
 * - Optional one-to-one relationship with a WorkerZone
 */
export type WorkerType = {
  id: string;
  role: Role;
  label: string | null;
  zone?: WorkerZone | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * WorkerZone:
 * - Stores perimeter info for a WorkerType
 */
export type WorkerZone = {
  id: string;
  workerTypeId: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  createdAt: Date;
  updatedAt: Date;
  workerType?: WorkerType;
};
