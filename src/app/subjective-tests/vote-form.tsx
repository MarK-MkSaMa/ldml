"use client";

import { useActionState } from "react";
import { submitSubjectiveVoteAction, type SubjectiveVoteState } from "./actions";

type Entry = { id: string; modelName: string };

const initialState: SubjectiveVoteState = { ok: false, message: "" };

export function SubjectiveVoteForm({
  activityId,
  entries,
  canVote,
  userRanks,
}: {
  activityId: string;
  entries: Entry[];
  canVote: boolean;
  userRanks: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState(submitSubjectiveVoteAction, initialState);
  const ranks = Array.from({ length: entries.length }, (_, index) => index + 1);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <input type="hidden" name="activityId" value={activityId} />
      <div>
        <h2 className="text-lg font-semibold">提交你的完整排序</h2>
        <p className="mt-1 text-sm text-zinc-500">请选择第 1 名、第 2 名……所有输出都必须排序且名次不能重复。</p>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <label key={entry.id} className="grid gap-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900/70 md:grid-cols-[1fr_160px] md:items-center">
            <span className="font-medium">{entry.modelName}</span>
            <select
              name={`rank:${entry.id}`}
              required
              disabled={!canVote || pending}
              defaultValue={userRanks[entry.id]?.toString() ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">选择名次</option>
              {ranks.map((rank) => (
                <option key={rank} value={rank}>第 {rank} 名</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canVote || pending || entries.length < 2}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "保存中…" : "提交排序"}
        </button>
        {state.message && (
          <span className={`text-sm ${state.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
