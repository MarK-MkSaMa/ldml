/**
 * 顶部右侧的登录 / 用户菜单（服务端组件）
 *
 * 未登录：显示"登录"按钮
 * 已登录：显示头像 + 用户名 + 登出按钮
 */
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { signOut } from "@/auth";
import { getCurrentUserFresh } from "@/lib/current-user";

export async function SessionMenu() {
  const user = await getCurrentUserFresh();
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-zinc-100 sm:px-1.5 dark:hover:bg-zinc-800"
        title="个人中心"
        aria-label={`个人中心：${user.username}`}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <CircleUserRound className="h-7 w-7 text-zinc-500" aria-hidden />
        )}
        <span className="hidden sm:inline">{user.username}</span>
      </Link>
      {user.isAdmin && (
        <Link
          href="/admin"
          className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200 sm:inline-block dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
        >
          管理员
        </Link>
      )}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          登出
        </button>
      </form>
    </div>
  );
}
