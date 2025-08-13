import "reflect-metadata"
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { headers } from 'next/headers';
import { db } from "@/lib/db";
import { Role } from "@/app/generated/prisma";
import { Shift } from "@/types";

// Define GraphQL schema
const typeDefs = `#graphql
    scalar JSON

    enum Role {
    DOCTOR
    NURSE
    PARAMEDIC
    TECHNICIAN
    SUPPORT_STAFF
    PHARMACIST
    THERAPIST
    ADMINISTRATIVE
    HCA
    }

    type User {
        id: String!
        auth0Id: String!
        name: String!
        email: String!
        role: Role!           
        picture: String
        createdAt: String!
        updatedAt: String!
    }

    type WorkerZone {
        id: String!
        lat: Float!
        lng: Float!
        radius: Float!
    }

    type StaffLocation {
        role: Role!
        label: String
        workerZone: WorkerZone
    }

    extend type Query {
        workerZoneForCurrentUser: StaffLocation!
    }

   type Query {
        hello: String
        me: User
        currentUser: User
        roles: [Role!]!
        staffLocations: [StaffLocation!]!
    }

   type Mutation {
        registerUser(input: RegisterUserInput!): RegisterUserResponse!
        updateUser(input: UpdateUserInput!): User!
        updateStaffLocation(id: ID!, lat: Float!, lng: Float!, radius: Float!): StaffLocation!
    }

    input RegisterUserInput {
        name: String
        additionalData: String
        role: Role! 
    }

    input UpdateUserInput {
        name: String
        additionalData: String
    }

    type RegisterUserResponse {
        user: User!
        isNewUser: Boolean!
        message: String!
    }

   input LoginUserInput {
        email: String!
    }

    type LoginUserPayload {
        user: User!
    }

    extend type Query {
        loginUser(input: LoginUserInput!): LoginUserPayload!
        shiftsForCurrentUser: [Shift!]!
        allShiftsForAdmin: [ShiftForAdmin!]!
    }

    type Mutation {
        clockIn(clockInLat: Float!, clockInLng: Float!, clockInNote: String): Shift!
        clockOut(clockOutLat: Float!, clockOutLng: Float!, clockOutNote: String): Shift!
    }

    type Shift {
        id: String!
        clockIn: String!
        clockOut: String
        clockInLat: Float!
        clockInLng: Float!
        clockOutLat: Float
        clockOutLng: Float
        clockInNote: String
        clockOutNote: String
        userId: String!
    }

   type ShiftForAdmin { 
        id: String!
        clockIn: String!
        clockOut: String
        clockInLat: Float!
        clockInLng: Float!
        clockOutLat: Float
        clockOutLng: Float
        clockInNote: String
        clockOutNote: String
        userId: String!
        user: User!
    }


`

// Define resolvers
const resolvers = {
    Query: {
        hello: () => 'Hello from GraphQL',

        me: async (_parent: any, _args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error('Not authenticated');
            }

            // Get user from database
            const user = await db.user.findUnique({
                where: { auth0Id: ctx.session.user.sub }
            });

            return user;
        },

        currentUser: async (_parent: any, _args: any, ctx: any) => {
            if (!ctx.session?.user) {
                return null;
            }

            const user = await db.user.findUnique({
                where: { auth0Id: ctx.session.user.sub }
            });

            return user;
        },

        workerZoneForCurrentUser: async (_parent: any, _args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            // Find the current user
            const user = await db.user.findUnique({
                where: { auth0Id: ctx.session.user.sub },
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Find worker type + zone for the user's role
            const workerType = await db.workerType.findUnique({
                where: { role: user.role },
                include: { zone: true },
            });

            if (!workerType) {
                throw new Error("No worker type found for this role");
            }

            return {
                role: workerType.role,
                label: workerType.label,
                workerZone: workerType.zone
                    ? {
                        id: workerType.zone.id,
                        lat: workerType.zone.latitude,
                        lng: workerType.zone.longitude,
                        radius: workerType.zone.radius,
                    }
                    : null,
            };
        },

        loginUser: async (_parent: any, { input }: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            const auth0Id = ctx.session.user.sub;

            const user = await db.user.findUnique({
                where: { auth0Id },
            });

            if (!user) {
                throw new Error("User not found. Please register first.");
            }

            return {
                user,
            };
        },

        shiftsForCurrentUser: async (_parent: any, __: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            // Fetch all shifts for logged-in user, latest first
            const shifts: Shift[] = await db.shift.findMany({
                where: { userId: ctx.session?.user.id },
                orderBy: { clockIn: "desc" },
            });

            // Convert dates to timestamps (string) for frontend compatibility
            return shifts.map((shift) => ({
                ...shift,
                clockIn: shift.clockIn.getTime().toString(),
                clockOut: shift.clockOut ? shift.clockOut.getTime().toString() : null,
            }));
        },

        allShiftsForAdmin: async (_parent: any, _args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            const currentUser = await db.user.findUnique({
                where: { auth0Id: ctx.session.user.sub },
            });

            if (!currentUser || currentUser.role !== "ADMINISTRATIVE") {
                throw new Error("Unauthorized");
            }

            const shifts = await db.shift.findMany({
                include: {
                    user: true, // fetch user data
                },
                orderBy: { clockIn: "desc" },
            });

            // Map to ShiftForAdmin type (convert Date → String)
            return shifts.map((shift) => ({
                ...shift,
                clockIn: shift.clockIn.toISOString(),
                clockOut: shift.clockOut ? shift.clockOut.toISOString() : null,
            }));
        }
        ,


        roles: () => Object.values(Role),

        staffLocations: async () => {
            const zones = await db.workerType.findMany({
                where: {
                    role: { not: 'ADMINISTRATIVE' }
                },
                include: {
                    zone: true
                }
            });

            return zones.map(wt => ({
                role: wt.role,
                label: wt.label,
                workerZone: wt.zone
                    ? {
                        id: wt.zone.id,
                        lat: wt.zone.latitude,
                        lng: wt.zone.longitude,
                        radius: wt.zone.radius
                    }
                    : null
            }));
        }
    },
    Mutation: {
        registerUser: async (_parent: any, args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error('Not authenticated');
            }

            const { sub, name, email, picture } = ctx.session.user;

            try {
                // Check if user already exists
                const existingUser = await db.user.findUnique({
                    where: { auth0Id: sub }
                });

                if (existingUser) {
                    return {
                        user: existingUser,
                        isNewUser: false,
                        message: 'User already registered'
                    };
                }

                // Create new user with role
                const newUser = await db.user.create({
                    data: {
                        auth0Id: sub,
                        name: args.input.name || name,
                        email,
                        picture,
                        role: args.input.role
                    }
                });

                return {
                    user: newUser,
                    isNewUser: true,
                    message: 'User registered successfully'
                };

            } catch (error) {
                console.error('Registration error:', error);
                throw new Error('Failed to register user');
            }
        },

        updateUser: async (_parent: any, args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error('Not authenticated');
            }

            try {
                const updatedUser = await db.user.update({
                    where: { id: ctx.session.user.sub },
                    data: {
                        ...(args.input.name && { name: args.input.name }),
                        ...(args.input.additionalData && {
                            additionalData: args.input.additionalData
                        }),
                        updatedAt: new Date()
                    }
                });

                return updatedUser;
            } catch (error) {
                console.error('Update error:', error);
                throw new Error('Failed to update user');
            }
        },

        updateStaffLocation: async (_parent: any, args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            const { id, lat, lng, radius } = args;

            // Update the worker zone
            const updatedZone = await db.workerZone.update({
                where: { id },
                data: {
                    latitude: lat,
                    longitude: lng,
                    radius: radius
                },
                include: {
                    workerType: true,
                },
            });

            return {
                id: updatedZone.id,
                name: updatedZone.workerType.label ?? "",
                role: updatedZone.workerType.role,
                lat: updatedZone.latitude,
                lng: updatedZone.longitude,
                radius: updatedZone.radius / 1000,
            };
        },

        clockIn: async (_parent: any, args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            // Get user from database
            const user = await db.user.findUnique({
                where: { auth0Id: ctx.session.user.sub },
            });
            if (!user) throw new Error("User not found");

            // Check if there's already an active shift
            const activeShift = await db.shift.findFirst({
                where: {
                    userId: user.id,
                    clockOut: null,
                },
            });
            if (activeShift) {
                throw new Error("You are already clocked in.");
            }

            // Create a new shift
            const shift = await db.shift.create({
                data: {
                    userId: user.id,
                    clockIn: new Date(),
                    clockInLat: args.clockInLat,
                    clockInLng: args.clockInLng,
                    clockInNote: args.clockInNote || null,
                },
            });

            return shift;
        },

        clockOut: async (_parent: any, args: any, ctx: any) => {
            if (!ctx.session?.user) {
                throw new Error("Not authenticated");
            }

            const user = await db.user.findUnique({
                where: { auth0Id: ctx.session.user.sub },
            });
            if (!user) throw new Error("User not found");

            // Find active shift
            const activeShift = await db.shift.findFirst({
                where: {
                    userId: user.id,
                    clockOut: null,
                },
            });
            if (!activeShift) {
                throw new Error("No active shift found.");
            }

            // Update the shift with clockOut details
            const updatedShift = await db.shift.update({
                where: { id: activeShift.id },
                data: {
                    clockOut: new Date(),
                    clockOutLat: args.clockOutLat,
                    clockOutLng: args.clockOutLng,
                    clockOutNote: args.clockOutNote || null,
                },
            });

            return updatedShift;
        },
    },
};

// Create Apollo Server instance
const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const handler = startServerAndCreateNextHandler<NextRequest>(server, {
    context: async (req) => {
        try {
            const mockIncomingMessage = {
                ...req,
                headers: Object.fromEntries(req.headers.entries()),
                url: req.url,
                method: req.method,
            } as any;

            const mockServerResponse = {
                getHeader: () => undefined,
                setHeader: () => { },
                writeHead: () => { },
                end: () => { },
            } as any;

            const session = await getSession(mockIncomingMessage, mockServerResponse);

            // Only return session in context - don't do database operations here
            return { session };

        } catch (error) {
            console.warn('Failed to get session:', error);
            return { session: null };
        }
    },
});

export { handler as GET, handler as POST };