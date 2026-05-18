/**
 * Auth.js 类型扩展
 * 给 session.user 增加我们自己塞进去的字段
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      linuxdoId: number;
      username: string;
      trustLevel: number;
      isAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    linuxdoId?: number;
    username?: string;
    trustLevel?: number;
    isAdmin?: boolean;
  }
}
