"use client";

import { useState } from "react";
import Link from "next/link";
import { suggestSlug } from "@/lib/slug";

export type DimensionFormInitial = {
  categoryId: number;
  slug: string;
  name: string;
  description: string;
  order: number;
};

export function DimensionForm({
  initial,
  categories,
  action,
  submitLabel = "保存",
}: {
  initial?: Partial<DimensionFormInitial>;
  categories: { id: number; name: string }[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [state, setState] = useState<DimensionFormInitial>({
    categoryId: initial?.categoryId ?? categories[0]?.id ?? 0,
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    order: initial?.order ?? 0,
  });
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  function update<K extends keyof DimensionFormInitial>(
    key: K,
    value: DimensionFormInitial[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="max-w-2xl space-y-5"
    >
      <Row label="分类" required>
        <select
          name="categoryId"
          value={state.categoryId || ""}
          onChange={(e) => update("categoryId", Number(e.target.value))}
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

      <Row label="名称" required hint="表头显示用，例如『代码能力』『写实度』">
        <input
          name="name"
          value={state.name}
          onChange={(e) => {
            const v = e.target.value;
            update("name", v);
            if (!slugTouched) update("slug", suggestSlug(v));
          }}
          required
          maxLength={40}
          className={inputCls}
        />
      </Row>

      <Row
        label="slug"
        required
        hint="数据库标识，建议简短英文；同一分类下唯一"
      >
        <input
          name="slug"
          value={state.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update("slug", e.target.value);
          }}
          required
          maxLength={40}
          pattern="[a-z0-9][a-z0-9-]*"
          className={inputCls}
          placeholder="code / rp / task ..."
        />
      </Row>

      <Row label="描述" hint="鼠标悬停时显示的提示文字（可选）">
        <textarea
          name="description"
          value={state.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={200}
          rows={2}
          className={inputCls}
        />
      </Row>

      <Row label="排序" hint="数字越小越靠前">
        <input
          name="order"
          type="number"
          value={state.order}
          onChange={(e) => update("order", Number(e.target.value))}
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
          href="/admin/dimensions"
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
