"use client";

import { useActionState } from "react";
import { upsertBenchmarkResultAction } from "./actions";

type State = { ok: boolean; message: string };
const initialState: State = { ok: false, message: "" };

async function submit(_prevState: State, formData: FormData): Promise<State> {
  try {
    await upsertBenchmarkResultAction(formData);
    return { ok: true, message: "结果已保存" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败",
    };
  }
}

type ResultInitialValue = {
  modelName: string;
  isCorrect: boolean;
  modelAnswer?: string | null;
  note?: string | null;
};

export function BenchmarkResultForm({
  questionId,
  initialValue,
}: {
  questionId: string;
  initialValue?: ResultInitialValue;
}) {
  const [state, formAction, pending] = useActionState(submit, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/60">
      <input type="hidden" name="questionId" value={questionId} />
      <div className="grid gap-3 md:grid-cols-[1fr_120px]">
        <input
          name="modelName"
          required
          maxLength={120}
          className={inputCls}
          placeholder="模型名，如 GPT-5"
          defaultValue={initialValue?.modelName ?? ""}
        />
        <select name="isCorrect" required className={inputCls} defaultValue={initialValue ? String(initialValue.isCorrect) : "true"}>
          <option value="true">正确</option>
          <option value="false">错误</option>
        </select>
      </div>
      <textarea
        name="modelAnswer"
        rows={3}
        maxLength={20000}
        className={inputCls}
        placeholder="模型回答（可选）"
        defaultValue={initialValue?.modelAnswer ?? ""}
      />
      <textarea
        name="note"
        rows={2}
        maxLength={2000}
        className={inputCls}
        placeholder="备注（可选）"
        defaultValue={initialValue?.note ?? ""}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "保存中…" : initialValue ? "更新结果" : "添加 / 更新结果"}
        </button>
        {state.message && (
          <span className={`text-xs ${state.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
