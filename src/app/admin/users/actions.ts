"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { env } from "@/env";
import {
  setUserBannedAdmin,
  setUserAdminFlag,
  countAdminUsers,
  getUserByIdForAdmin,
} from "@/lib/admin-users";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("无权限");
  return session.user.id;
}

function bust() {
  revalidatePath("/admin/users");
}

export async function setBannedAction(userId: string, banned: boolean) {
  const adminId = await requireAdmin();
  if (userId === adminId && banned) {
    throw new Error("不能封禁自己");
  }
  await setUserBannedAdmin(userId, banned);
  bust();
}

export async function setAdminFlagAction(userId: string, isAdmin: boolean) {
  const adminId = await requireAdmin();
  // 不允许自己取消自己的管理员
  if (userId === adminId && !isAdmin) {
    throw new Error("不能取消自己的管理员权限");
  }
  // 不允许把唯一管理员降级
  if (!isAdmin) {
    const total = await countAdminUsers();
    if (total <= 1) {
      throw new Error("至少要保留一个管理员");
    }
  }
  // env 里写死的"超级管理员"不可降级
  if (!isAdmin) {
    const target = await getUserByIdForAdmin(userId);
    if (target && env.ADMIN_LINUXDO_IDS.includes(String(target.linuxdoId))) {
      throw new Error(
        "该用户的 Linux DO ID 已写入 ADMIN_LINUXDO_IDS，无法从后台降级；请改环境变量",
      );
    }
  }
  await setUserAdminFlag(userId, isAdmin);
  bust();
}
