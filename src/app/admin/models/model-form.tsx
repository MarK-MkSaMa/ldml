"use client";

/**
 * 模型编辑表单
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
  categoryId: number;
  lab: string;
  homepageUrl: string;
  releasedAt: string;
  contextTokens: string;
  outputTokens: string;
  inputModalities: string;
  outputModalities: string;
  supportsReasoning: boolean;
  supportsToolCall: boolean;
  openWeights: "unknown" | "true" | "false";
  priceInput: string;
  priceOutput: string;
  priceCacheRead: string;
  priceCacheWrite: string;
  status: ModelStatus;
  pinned: boolean;
};

const EMPTY: ModelFormInitial = {
  name: "",
  slug: "",
  categoryId: 0,
  lab: "",
  homepageUrl: "",
  releasedAt: "",
  contextTokens: "",
  outputTokens: "",
  inputModalities: "",
  outputModalities: "",
  supportsReasoning: false,
  supportsToolCall: false,
  openWeights: "unknown",
  priceInput: "",
  priceOutput: "",
  priceCacheRead: "",
  priceCacheWrite: "",
  status: "draft",
  pinned: false,
};

export function ModelForm({
  initial,
  categories,
  action,
  submitLabel = "保存",
}: {
  initial?: Partial<ModelFormInitial>;
  categories: { id: number; name: string }[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [state, setState] = useState<ModelFormInitial>({
    ...EMPTY,
    ...initial,
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
          placeholder="openai-gpt-5"
        />
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

      <Row label="来源 lab">
        <input
          name="lab"
          value={state.lab}
          onChange={(e) => update("lab", e.target.value)}
          maxLength={80}
          className={inputCls}
          placeholder="OpenAI / Anthropic / Alibaba ..."
        />
      </Row>

      <Row label="官网 / 文档">
        <input
          name="homepageUrl"
          type="url"
          value={state.homepageUrl}
          onChange={(e) => update("homepageUrl", e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </Row>

      <Row label="Release">
        <input
          name="releasedAt"
          type="date"
          value={state.releasedAt}
          onChange={(e) => update("releasedAt", e.target.value)}
          className={inputCls}
        />
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Context tokens">
          <input
            name="contextTokens"
            type="number"
            min={0}
            value={state.contextTokens}
            onChange={(e) => update("contextTokens", e.target.value)}
            className={inputCls}
            placeholder="128000"
          />
        </Row>
        <Row label="Output tokens">
          <input
            name="outputTokens"
            type="number"
            min={0}
            value={state.outputTokens}
            onChange={(e) => update("outputTokens", e.target.value)}
            className={inputCls}
            placeholder="16384"
          />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Input modalities" hint="逗号分隔，例如 text,image">
          <input
            name="inputModalities"
            value={state.inputModalities}
            onChange={(e) => update("inputModalities", e.target.value)}
            className={inputCls}
            placeholder="text,image"
          />
        </Row>
        <Row label="Output modalities" hint="逗号分隔，例如 text">
          <input
            name="outputModalities"
            value={state.outputModalities}
            onChange={(e) => update("outputModalities", e.target.value)}
            className={inputCls}
            placeholder="text"
          />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="supportsReasoning"
            checked={state.supportsReasoning}
            onChange={(e) => update("supportsReasoning", e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          支持 reasoning
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="supportsToolCall"
            checked={state.supportsToolCall}
            onChange={(e) => update("supportsToolCall", e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          支持 tool call
        </label>
      </div>

      <Row label="Weight">
        <select
          name="openWeights"
          value={state.openWeights}
          onChange={(e) => update("openWeights", e.target.value as ModelFormInitial["openWeights"])}
          className={inputCls}
        >
          <option value="unknown">未知</option>
          <option value="true">Open weights</option>
          <option value="false">Closed weights</option>
        </select>
      </Row>

      <div className="grid gap-4 sm:grid-cols-4">
        <Row label="Price input">
          <input
            name="priceInput"
            type="number"
            min={0}
            step="0.000001"
            value={state.priceInput}
            onChange={(e) => update("priceInput", e.target.value)}
            className={inputCls}
          />
        </Row>
        <Row label="Price output">
          <input
            name="priceOutput"
            type="number"
            min={0}
            step="0.000001"
            value={state.priceOutput}
            onChange={(e) => update("priceOutput", e.target.value)}
            className={inputCls}
          />
        </Row>
        <Row label="Cache read">
          <input
            name="priceCacheRead"
            type="number"
            min={0}
            step="0.000001"
            value={state.priceCacheRead}
            onChange={(e) => update("priceCacheRead", e.target.value)}
            className={inputCls}
          />
        </Row>
        <Row label="Cache write">
          <input
            name="priceCacheWrite"
            type="number"
            min={0}
            step="0.000001"
            value={state.priceCacheWrite}
            onChange={(e) => update("priceCacheWrite", e.target.value)}
            className={inputCls}
          />
        </Row>
      </div>

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
