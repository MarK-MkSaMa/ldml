"use client";

import { useState } from "react";
import Link from "next/link";
import { suggestSlug } from "@/lib/slug";

export type CategoryFormInitial = {
  slug: string;
  name: string;
  order: number;
};

export function CategoryForm({
  initial,
  action,
  submitLabel = "保存",
  isEdit = false,
  originalSlug,
}: {
  initial?: Partial<CategoryFormInitial>;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  isEdit?: boolean;
  originalSlug?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [pending, setPending] = useState(false);

  const slugChanged = isEdit && originalSlug && slug !== originalSlug;

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="max-w-2xl space-y-5"
    >
      <Row label="名称" required hint="显示在前台 Tab 上，例如『文字模型』『生图模型』">
        <input
          name="name"
          value={name}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (!slugTouched) setSlug(suggestSlug(v));
          }}
          required
          maxLength={30}
          className={inputCls}
          placeholder="文字模型"
        />
      </Row>

      <Row
        label="slug"
        required
        hint="URL 标识，小写英文 + 连字符。例如 text / image / video"
      >
        <input
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          maxLength={40}
          pattern="[a-z0-9][a-z0-9-]*"
          className={inputCls}
          placeholder="text"
        />
        {slugChanged && (
          <p className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            ⚠️ 修改 slug 会破坏所有指向旧 URL 的链接和书签（例如{" "}
            <code className="font-mono">/rankings/{originalSlug}</code>）。
          </p>
        )}
      </Row>

      <Row label="排序" hint="数字越小越靠前；前台 Tab 按这个顺序排列">
        <input
          name="order"
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className={inputCls}
        />
      </Row>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "保存中…" : submitLabel}
        </button>
        <Link
          href="/admin/categories"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          取消
        </Link>
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
