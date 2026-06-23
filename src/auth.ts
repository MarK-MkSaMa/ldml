/**
 * Auth.js (NextAuth v5) 配置
 *
 * 自定义 Linux DO 作为 OAuth Provider：
 *   - 授权:  https://connect.linux.do/oauth2/authorize
 *   - Token: https://connect.linux.do/oauth2/token
 *   - 用户:  https://connect.linux.do/api/user
 *
 * 登录成功后：
 *   1. 在 users 表中 upsert 用户（基于 linuxdo_id）
 *   2. 同步 trust_level / username / avatar
 *   3. 如果是 ADMIN_LINUXDO_IDS 中的用户，自动设为 is_admin
 *   4. 把 users.id (uuid) 和 trust_level 写入 session
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env, requireEnv } from "@/env";

// ============================================================
// Node 全局 fetch 走代理
//
// Node 18+ 的内置 fetch（基于 undici）不会读 HTTPS_PROXY 环境变量，
// 导致 OAuth 出站请求在 DNS 污染 + 必须走代理的网络下失败。
// 这里在检测到 HTTPS_PROXY / HTTP_PROXY 时显式安装 ProxyAgent。
// ============================================================
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

/**
 * Linux DO 返回的用户信息字段
 * 参考：https://connect.linux.do/
 */
type LinuxDoProfile = {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
  active?: boolean;
  trust_level?: number;
  silenced?: boolean;
  external_ids?: Record<string, string>;
  api_key?: string;
  email?: string;
};

const linuxdoProvider = {
  id: "linuxdo",
  name: "Linux DO",
  type: "oauth" as const,
  issuer: "https://connect.linux.do",
  checks: ["state"] as const,
  authorization: {
    url: "https://connect.linux.do/oauth2/authorize",
    params: { scope: "" },
  },
  token: "https://connect.linux.do/oauth2/token",
  userinfo: "https://connect.linux.do/api/user",
  clientId: requireEnv("LINUXDO_CLIENT_ID"),
  clientSecret: requireEnv("LINUXDO_CLIENT_SECRET"),
  // 把 OAuth profile 标准化为 Auth.js 的 User 形状
  profile(profile: LinuxDoProfile) {
    return {
      id: String(profile.id),
      name: profile.username,
      image: profile.avatar_url ?? null,
      // 我们自己塞进 user 上的额外字段
      linuxdoId: profile.id,
      username: profile.username,
      trustLevel: profile.trust_level ?? 0,
    };
  },
};

const config: NextAuthConfig = {
  // session 通过 JWT 维护（不需要在数据库中存 sessions 表）
  session: { strategy: "jwt" },
  secret: requireEnv("AUTH_SECRET"),
  trustHost: true,
  providers: [linuxdoProvider],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * 登录成功时触发，在此处 upsert users 表
     * 返回 false 会阻止登录
     */
    async signIn({ user, account }) {
      if (account?.provider !== "linuxdo") return false;
      const linuxdoId = (user as { linuxdoId?: number }).linuxdoId;
      const username = (user as { username?: string }).username;
      const trustLevel = (user as { trustLevel?: number }).trustLevel ?? 0;
      if (!linuxdoId || !username) return false;

      const isInAdminEnv = env.ADMIN_LINUXDO_IDS.includes(String(linuxdoId));

      // upsert 基于 linuxdoId 唯一索引
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.linuxdoId, linuxdoId));

      if (existing) {
        if (existing.isBanned) return false; // 被封禁用户拒绝登录
        // is_admin 规则：
        //   1. ADMIN_LINUXDO_IDS 里的用户始终保留管理员（防止误降级把自己锁外）
        //   2. 否则保留数据库当前值（允许后台手动调整）
        const nextIsAdmin = isInAdminEnv ? true : existing.isAdmin;
        await db
          .update(users)
          .set({
            username,
            displayName: user.name ?? username,
            avatarUrl: user.image ?? null,
            trustLevel,
            isAdmin: nextIsAdmin,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, existing.id));
      } else {
        await db.insert(users).values({
          linuxdoId,
          username,
          displayName: user.name ?? username,
          avatarUrl: user.image ?? null,
          trustLevel,
          // 新用户首次登录：只有 env 列表里的才直接成为管理员
          isAdmin: isInAdminEnv,
          lastLoginAt: new Date(),
        });
      }
      return true;
    },

    /**
     * JWT 生成 / 刷新时触发
     * 把 users.id (uuid) 和 trust_level、is_admin 写入 token
     */
    async jwt({ token, user }) {
      // 首次登录（user 存在），从 DB 查 users.id
      if (user) {
        const linuxdoId = (user as { linuxdoId?: number }).linuxdoId;
        if (linuxdoId) {
          const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.linuxdoId, linuxdoId));
          if (dbUser) {
            token.uid = dbUser.id;
            token.linuxdoId = dbUser.linuxdoId;
            token.username = dbUser.username;
            token.trustLevel = dbUser.trustLevel;
            token.isAdmin = dbUser.isAdmin;
          }
        }
      }
      return token;
    },

    /**
     * Session 暴露给客户端的字段
     */
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid as string,
        linuxdoId: token.linuxdoId as number,
        username: token.username as string,
        trustLevel: token.trustLevel as number,
        isAdmin: token.isAdmin as boolean,
      };
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
