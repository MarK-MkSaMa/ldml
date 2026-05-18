/**
 * 顶部右侧的登录 / 用户菜单（服务端组件）
 *
 * 未登录：显示"登录"按钮
 * 已登录：显示头像 + 用户名 + 登出按钮
 */
import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function SessionMenu() {
  const session = await auth();
  if (!session?.user) {
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
    <div className="flex items-center gap-3">
      {session.user.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt=""
          className="h-7 w-7 rounded-full"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="text-sm">
        {session.user.username}
        {session.user.isAdmin && (
          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            管理员
          </span>
        )}
      </span>
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
