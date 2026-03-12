import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Phone + OTP (Mock: any 6-digit code passes)
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        schoolId: { label: "School ID", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string;
        const otp = credentials?.otp as string;
        // Mock: accept any 6-digit numeric code
        if (!/^\d{6}$/.test(otp)) return null;
        const db = createAdminClient();
        const { data: user } = await db
          .from("users")
          .select("id, name, phone, role, school_id, avatar_url")
          .eq("phone", phone)
          .single();
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          schoolId: user.school_id,
          image: user.avatar_url,
        };
      },
    }),
    // Email/Password (for teachers and admins)
    CredentialsProvider({
      id: "credentials",
      name: "Password",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string;
        const password = credentials?.password as string;
        if (!phone || !password) return null;
        const db = createAdminClient();
        const { data: user } = await db
          .from("users")
          .select("id, name, phone, role, school_id, avatar_url, password_hash")
          .eq("phone", phone)
          .single();
        if (!user || !user.password_hash) return null;
        // Simple comparison for demo; use bcrypt in production
        const { default: bcrypt } = await import("bcryptjs");
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          schoolId: user.school_id,
          image: user.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
});
