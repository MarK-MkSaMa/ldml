"use client";

import { useState, useTransition } from "react";
import { approveModelRequestAction, rejectModelRequestAction } from "./actions";

export function ModelRequestRowActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
}) {
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);

  if (status !== "pending") return <span className="text-zinc-400">—</span>;

  return (
    <div className="space-y-2 text-right text-xs">
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`确认通过“${name}”并创建观察区模型？`)) return;
            startTransition(async () => {
              await approveModelRequestAction(id);
            });
          }}
          className="text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
        >
          通过
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowReject((v) => !v)}
          className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          拒绝
        </button>
      </div>

      {showReject && (
        <form action={rejectModelRequestAction} className="flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <input
            name="rejectReason"
            placeholder="拒绝原因（可选）"
            className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-red-600 px-2 py-1 text-white hover:bg-red-500"
          >
            确认
          </button>
        </form>
      )}
    </div>
  );
}
