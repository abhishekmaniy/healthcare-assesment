-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('DOCTOR', 'NURSE', 'PARAMEDIC', 'TECHNICIAN', 'SUPPORT_STAFF', 'PHARMACIST', 'THERAPIST', 'ADMINISTRATIVE', 'HCA');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "auth0_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'NURSE',
    "picture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."worker_types" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."worker_zones" (
    "id" TEXT NOT NULL,
    "workerTypeId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shifts" (
    "id" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "clockInLat" DOUBLE PRECISION NOT NULL,
    "clockInLng" DOUBLE PRECISION NOT NULL,
    "clockOutLat" DOUBLE PRECISION,
    "clockOutLng" DOUBLE PRECISION,
    "clockInNote" TEXT,
    "clockOutNote" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_id_key" ON "public"."users"("auth0_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "worker_types_role_key" ON "public"."worker_types"("role");

-- CreateIndex
CREATE UNIQUE INDEX "worker_zones_workerTypeId_key" ON "public"."worker_zones"("workerTypeId");

-- AddForeignKey
ALTER TABLE "public"."worker_zones" ADD CONSTRAINT "worker_zones_workerTypeId_fkey" FOREIGN KEY ("workerTypeId") REFERENCES "public"."worker_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
