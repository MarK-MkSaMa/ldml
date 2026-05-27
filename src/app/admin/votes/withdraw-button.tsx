"use client";

import { useFormStatus } from "react-dom";
import { withdrawVoteAdminAction } from "./actions";

function ScoreButton({ score }: { score: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="点击撤销该评分"
      className="rounded px-2 py-1 font-medium tabular-nums text-zinc-900 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-red-950/40 dark:hover:text-red-300"
    >
      {pending ? "…" : score.toFixed(1)}
    </button>
  );
}

export function WithdrawButton({
  userId,
  modelId,
  dimensionId,
  score,
}: {
  userId: string;
  modelId: string;
  dimensionId: number;
  score: number;
}) {
  return (
    <form
      action={withdrawVoteAdminAction}
      onSubmit={(event) => {
        if (!confirm("确认撤销该用户在此维度的评分？")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="modelId" value={modelId} />
      <input type="hidden" name="dimensionId" value={dimensionId} />
      <ScoreButton score={score} />
    </form>
  );
}
