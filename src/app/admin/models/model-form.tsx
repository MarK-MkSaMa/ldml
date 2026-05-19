"use client";

/**
 * 模型新建 / 编辑表单
 */
import { useState } from "react";
import Link from "next/link";
import { suggestSlug } from "@/lib/slug";
import { MODEL_STATUSES, type ModelStatus } from "@/lib/model-status";

const STATUS_LABEL: Record<ModelStatus, string> = {
  draft: "草稿",
  observing: "观察区",
  listed: "正式榜",
  archived: "归档",
};

export type ModelFormInitial = {
  name: string;
  slug: string;
  licenseId: number;
  categoryId: number;
  vendor: string;
  logoUrl: string;
  homepageUrl: string;
  description: string;
  contextLength: string; // 表单里都是字符串
  params: string;
  releasedAt: string;
  status: ModelStatus;
  pinned: boolean;
};

const EMPTY: ModelFormInitial = {
  name: "",
  slug: "",
  licenseId: 0,
  categoryId: 0,
  vendor: "",
  logoUrl: "",
  homepageUrl: "",
  description: "",
  contextLength: "",
  params: "",
  releasedAt: "",
  status: "draft",
  pinned: false,
};

export function ModelForm({
  initial,
  licenses,
  categories,
  action,
  submitLabel = "保存",
}: {
  initial?: Partial<ModelFormInitial>;
  licenses: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [state, setState] = useState<ModelFormInitial>({
    ...EMPTY,
    ...initial,
    licenseId: initial?.licenseId ?? licenses[0]?.id ?? 0,
    categoryId: initial?.categoryId ?? categories[0]?.id ?? 0,
  });
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  function update<K extends keyof ModelFormInitial>(key: K, value: ModelFormInitial[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="space-y-5"
    >
      <Row label="名称" required>
        <input
          name="name"
          value={state.name}
          onChange={(e) => {
            const v = e.target.value;
            update("name", v);
            if (!slugTouched) update("slug", suggestSlug(v));
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
          value={state.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update("slug", e.target.value);
          }}
          required
          maxLength={80}
          pattern="[a-z0-9][a-z0-9-]*"
          className={inputCls}
          placeholder="gpt-5"
        />
      </Row>

      <div className="grid grid-cols-2 gap-4">
        <Row label="开源属性" required>
          <select
            name="licenseId"
            value={state.licenseId || ""}
            onChange={(e) => update("licenseId", Number(e.target.value))}
            required
            className={inputCls}
          >
            {licenses.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Row>
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
      </div>

      <Row label="厂商">
        <input
          name="vendor"
          value={state.vendor}
          onChange={(e) => update("vendor", e.target.value)}
          maxLength={60}
          className={inputCls}
          placeholder="OpenAI / Anthropic / Alibaba ..."
        />
      </Row>

      <Row label="描述" hint="一句话简介，会显示在详情页">
        <textarea
          name="description"
          value={state.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={2000}
          rows={3}
          className={inputCls}
        />
      </Row>

      <div className="grid grid-cols-2 gap-4">
        <Row label="参数量" hint="比如 70B / 671B (MoE)">
          <input
            name="params"
            value={state.params}
            onChange={(e) => update("params", e.target.value)}
            className={inputCls}
          />
        </Row>
        <Row label="上下文长度" hint="整数（token 数）">
          <input
            name="contextLength"
            type="number"
            min={0}
            value={state.contextLength}
            onChange={(e) => update("contextLength", e.target.value)}
            className={inputCls}
          />
        </Row>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Row label="官网">
          <input
            name="homepageUrl"
            type="url"
            value={state.homepageUrl}
            onChange={(e) => update("homepageUrl", e.target.value)}
            className={inputCls}
            placeholder="https://..."
          />
        </Row>
        <Row label="Logo URL">
          <input
            name="logoUrl"
            type="url"
            value={state.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
            className={inputCls}
            placeholder="https://..."
          />
        </Row>
      </div>

      <Row label="发布日期">
        <input
          name="releasedAt"
          type="date"
          value={state.releasedAt}
          onChange={(e) => update("releasedAt", e.target.value)}
          className={inputCls}
        />
      </Row>

      <Row label="状态" required>
        <select
          name="status"
          value={state.status}
          onChange={(e) => update("status", e.target.value as ModelStatus)}
          required
          className={inputCls}
        >
          {MODEL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Row>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="pinned"
          checked={state.pinned}
          onChange={(e) => update("pinned", e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        在观察区置顶
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "保存中…" : submitLabel}
        </button>
        <Link
          href="/admin/models"
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
