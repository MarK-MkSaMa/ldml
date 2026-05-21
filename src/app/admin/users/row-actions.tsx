"use client";

import { useState, useTransition } from "react";
import { setBannedAction, setAdminFlagAction } from "./actions";

export function UserRowActions({
  userId,
  isAdmin,
  isBanned,
  isSelf,
}: {
  userId: string;
  isAdmin: boolean;
  isBanned: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作失败");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 text-xs">
        {isSelf && <span className="text-zinc-400">（自己）</span>}

        {!isSelf && (
          <>
            {isBanned ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setBannedAction(userId, false))}
                className="text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
              >
                解封
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm("确认封禁此用户？被封禁后无法登录、不能发表评分或评论")) return;
                  run(() => setBannedAction(userId, true));
                }}
                className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                封禁
              </button>
            )}
          </>
        )}

        {isAdmin ? (
          <button
            type="button"
            disabled={pending || isSelf}
            onClick={() => {
              if (!confirm("确认取消该用户的管理员权限？")) return;
              run(() => setAdminFlagAction(userId, false));
            }}
            className="text-zinc-500 hover:text-zinc-900 disabled:opacity-30 dark:hover:text-zinc-100"
          >
            撤管理员
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("确认将该用户设为管理员？将拥有完整后台权限")) return;
              run(() => setAdminFlagAction(userId, true));
            }}
            className="text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400"
          >
            设管理员
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
