import "reflect-metadata"
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { headers } from 'next/headers';
import { db } from "@/lib/db";
import { Role } from "@/app/generated/prisma";

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
                        radius: wt.zone.radius /1000
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