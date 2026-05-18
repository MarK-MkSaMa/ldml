/**
 * 登录页
 * 只显示"用 Linux DO 登录"按钮，已登录用户重定向回首页
 */
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← 返回首页
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">登录</h1>
          <p className="mt-2 text-sm text-zinc-500">
            使用 Linux DO 账号登录后可对模型评分、参与评论
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("linuxdo", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            使用 Linux DO 登录
          </button>
        </form>

        <p className="text-xs text-zinc-500">
          登录即表示你同意将 Linux DO 公开的用户名、头像与信任等级用于本站显示
        </p>
      </div>
    </main>
  );
}
