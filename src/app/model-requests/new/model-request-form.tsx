"use client";

import { useActionState, useState } from "react";
import { suggestSlug } from "@/lib/slug";
import { submitModelRequestAction, type ModelRequestFormState } from "./actions";

const initialState: ModelRequestFormState = { ok: false, message: "" };

export function ModelRequestForm({
  categories,
  initialCategoryId,
}: {
  categories: { id: number; name: string }[];
  initialCategoryId: number;
}) {
  const [state, formAction, pending] = useActionState(
    submitModelRequestAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
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

      <Row label="名称" required>
        <input
          name="name"
          value={name}
          onChange={(e) => {
            const value = e.target.value;
            setName(value);
            if (!slugTouched) setSlug(suggestSlug(value));
          }}
          required
          maxLength={100}
          className={inputCls}
          placeholder="GPT-5"
        />
      </Row>

      <Row label="slug" required hint="URL 唯一标识；只能小写字母、数字、连字符">
        <input
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          maxLength={80}
          pattern="[a-z0-9][a-z0-9-]*"
          className={inputCls}
          placeholder="gpt-5"
        />
      </Row>

      <Row label="分类" required>
        <select
          name="categoryId"
          defaultValue={initialCategoryId || categories[0]?.id}
          required
          className={inputCls}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Row>

      <Row label="厂商">
        <input
          name="vendor"
          maxLength={60}
          className={inputCls}
          placeholder="OpenAI / Anthropic / Alibaba ..."
        />
      </Row>

      <Row label="开源协议">
        <input
          name="licenseText"
          maxLength={80}
          className={inputCls}
          placeholder="Proprietary / MIT / Apache 2.0 ..."
        />
      </Row>

      <Row label="官网">
        <input
          name="homepageUrl"
          type="url"
          className={inputCls}
          placeholder="https://..."
        />
      </Row>

      <Row label="发布日期">
        <input name="releasedAt" type="date" className={inputCls} />
      </Row>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "提交中…" : "提交申请"}
        </button>
      </div>
    </form>
  );
}

function Row({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";
