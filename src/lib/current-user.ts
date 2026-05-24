import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: string;
  linuxdoId: number;
  username: string;
  avatarUrl: string | null;
  trustLevel: number;
  isAdmin: boolean;
  isBanned: boolean;
};

/**
 * 从 session 取用户 id 后重新查库，确保管理员/封禁/信任等级使用最新状态。
 */
export async function getCurrentUserFresh(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [user] = await db
    .select({
      id: users.id,
      linuxdoId: users.linuxdoId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      trustLevel: users.trustLevel,
      isAdmin: users.isAdmin,
      isBanned: users.isBanned,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || user.isBanned) return null;
  return user;
}

export async function requireCurrentUserFresh(): Promise<CurrentUser> {
  const user = await getCurrentUserFresh();
  if (!user) throw new Error("未登录");
  return user;
}

export async function requireAdminFresh(): Promise<CurrentUser> {
  const user = await requireCurrentUserFresh();
  if (!user.isAdmin) throw new Error("无权限");
  return user;
}
