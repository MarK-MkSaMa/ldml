"use client";

import { useActionState } from "react";
import { submitBenchmarkQuestionAction, type BenchmarkQuestionFormState } from "./actions";

const initialState: BenchmarkQuestionFormState = { ok: false, message: "" };

export function BenchmarkQuestionForm({ canSubmit }: { canSubmit: boolean }) {
  const [state, formAction, pending] = useActionState(
    submitBenchmarkQuestionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            state.ok
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          {state.message}
        </div>
      )}

      <Row label="题目内容" required>
        <textarea
          name="question"
          required
          maxLength={10000}
          rows={5}
          disabled={!canSubmit || pending}
          className={inputCls}
          placeholder="请输入要测试文字模型的题目"
        />
      </Row>

      <Row label="参考答案" required>
        <textarea
          name="referenceAnswer"
          required
          maxLength={10000}
          rows={4}
          disabled={!canSubmit || pending}
          className={inputCls}
          placeholder="请输入标准/参考答案"
        />
      </Row>

      <Row label="判题说明 / 备注">
        <textarea
          name="judgeNote"
          maxLength={2000}
          rows={3}
          disabled={!canSubmit || pending}
          className={inputCls}
          placeholder="可选：说明判题标准、容易误判的点等"
        />
      </Row>

      <button
        type="submit"
        disabled={!canSubmit || pending}
        className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "提交中…" : "提交题目"}
      </button>
    </form>
  );
}

function Row({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:disabled:bg-zinc-950";
