export type User = {
  id: string;
  auth0Id:string;
  name: string;
  email: string;
  picture: string | null;
  createdAt: Date;
  updatedAt: Date;
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
};
