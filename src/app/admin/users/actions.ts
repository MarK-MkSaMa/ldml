"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import {
  setUserBannedAdmin,
  setUserAdminFlag,
  countAdminUsers,
  getUserByIdForAdmin,
} from "@/lib/admin-users";
import { requireAdminFresh } from "@/lib/current-user";

function bust() {
  revalidatePath("/admin/users");
}

export async function setBannedAction(userId: string, banned: boolean) {
  const admin = await requireAdminFresh();
  const adminId = admin.id;
  if (userId === adminId && banned) {
    throw new Error("不能封禁自己");
  }
  await setUserBannedAdmin(userId, banned);
  bust();
}

export async function setAdminFlagAction(userId: string, isAdmin: boolean) {
  const admin = await requireAdminFresh();
  const adminId = admin.id;
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
