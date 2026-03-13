import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;

        const appPassword = process.env.APP_PASSWORD;
        if (!appPassword) {
          console.error("APP_PASSWORD nie jest ustawione w .env");
          return null;
        }

        if (credentials.password !== appPassword) return null;

        return { id: "1", name: "Admin" };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dni
  },
  pages: {
    signIn: "/login",
  },
};
