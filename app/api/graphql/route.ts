import "reflect-metadata"
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { headers } from 'next/headers';
import { db } from "@/lib/db";

// Define GraphQL schema
const typeDefs = `#graphql
    scalar JSON

    type User {
        id: String!
        auth0Id: String!
        name: String!
        email: String!
        picture: String
        createdAt: String!
        updatedAt: String!
    }

    type Query {
        hello: String
        me: User
        currentUser: User
    }

   type Mutation {
        registerUser(input: RegisterUserInput!): RegisterUserResponse!
        updateUser(input: UpdateUserInput!): User!
    }

    input RegisterUserInput {
        name: String
        additionalData: String
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

                console.log(existingUser)

                if (existingUser) {
                    return {
                        user: existingUser,
                        isNewUser: false,
                        message: 'User already registered'
                    };
                }

                // Create new user
                const newUser = await db.user.create({
                    data: {
                        auth0Id: sub,
                        name: args.input.name || name,
                        email: email,
                        picture: picture,
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