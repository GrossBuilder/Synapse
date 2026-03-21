import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "./prisma";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";
const SOCKET_JWT_KEY = new TextEncoder().encode(NEXTAUTH_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Synapse",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        name: { label: "Name", type: "text", placeholder: "Your name" },
        password: { label: "Password", type: "password" },
        region: { label: "Region", type: "text" },
        mode: { label: "Mode", type: "text" }, // "login" | "register"
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (credentials.mode === "register") {
          // Регистрация
          if (existingUser) return null; // email уже занят
          if (!credentials.name || credentials.name.trim().length < 2) return null;
          if (credentials.password.length < 8) return null;

          const hashedPassword = await bcrypt.hash(credentials.password, 12);
          const user = await prisma.user.create({
            data: {
              email,
              name: credentials.name.trim(),
              password: hashedPassword,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            region: credentials.region || "global",
          };
        }

        // Логин
        if (!existingUser || !existingUser.password) return null;
        if (existingUser.status === "BANNED") return null;

        const isValid = await bcrypt.compare(credentials.password, existingUser.password);
        if (!isValid) return null;

        return {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          image: existingUser.image,
          region: credentials.region || "global",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.region = (user as { region?: string }).region || "global";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; region: string }).id = token.id as string;
        (session.user as { id: string; region: string }).region = (token.region as string) || "global";
      }
      // Создаём подписанный JWT для авторизации сокета
      const socketToken = await new SignJWT({
        id: token.id as string,
        name: token.name as string,
        region: (token.region as string) || "global",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SOCKET_JWT_KEY);
      (session as unknown as { socketToken: string }).socketToken = socketToken;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
