"use client";

/**
 * 模型编辑表单
 */
import Link from "next/link";
import { useState } from "react";
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
    setState((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      action={action}
      onSubmit={() => setPending(true)}
      className="max-w-4xl space-y-6"
    >
      <FormSection
        title="基本信息"
        description="设置模型名称、分类和用于核验的来源信息。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="名称" required>
            <input
              name="name"
              value={state.name}
              onChange={(e) => {
                const value = e.target.value;
                update("name", value);
                if (!slugTouched) update("slug", suggestSlug(value));
              }}
              required
              maxLength={100}
              className={inputCls}
              placeholder="GPT-5"
            />
          </Row>

          <Row label="slug" required hint="URL 唯一标识；只能使用小写字母、数字和连字符">
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
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Row>

          <Row label="来源机构">
            <input
              name="lab"
              value={state.lab}
              onChange={(e) => update("lab", e.target.value)}
              maxLength={80}
              className={inputCls}
              placeholder="OpenAI / Anthropic / Alibaba ..."
            />
          </Row>

          <Row label="官网或文档">
            <input
              name="homepageUrl"
              type="url"
              value={state.homepageUrl}
              onChange={(e) => update("homepageUrl", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Row>

          <Row label="发布日期">
            <input
              name="releasedAt"
              type="date"
              value={state.releasedAt}
              onChange={(e) => update("releasedAt", e.target.value)}
              className={inputCls}
            />
          </Row>
        </div>
      </FormSection>

      <FormSection
        title="能力参数"
        description="设置上下文限制、输入输出类型和功能支持情况。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="上下文 tokens">
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
          <Row label="最大输出 tokens">
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
          <Row label="输入类型" hint="使用英文逗号分隔，例如 text,image">
            <input
              name="inputModalities"
              value={state.inputModalities}
              onChange={(e) => update("inputModalities", e.target.value)}
              className={inputCls}
              placeholder="text,image"
            />
          </Row>
          <Row label="输出类型" hint="使用英文逗号分隔，例如 text">
            <input
              name="outputModalities"
              value={state.outputModalities}
              onChange={(e) => update("outputModalities", e.target.value)}
              className={inputCls}
              placeholder="text"
            />
          </Row>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <CheckOption
            name="supportsReasoning"
            label="支持推理"
            checked={state.supportsReasoning}
            onChange={(checked) => update("supportsReasoning", checked)}
          />
          <CheckOption
            name="supportsToolCall"
            label="支持工具调用"
            checked={state.supportsToolCall}
            onChange={(checked) => update("supportsToolCall", checked)}
          />
        </div>
      </FormSection>

      <FormSection
        title="权重信息"
        description="记录模型权重是否公开；无法确认时保留为未知。"
      >
        <Row label="权重开放状态">
          <select
            name="openWeights"
            value={state.openWeights}
            onChange={(e) =>
              update("openWeights", e.target.value as ModelFormInitial["openWeights"])
            }
            className={inputCls}
          >
            <option value="unknown">未知</option>
            <option value="true">开源权重</option>
            <option value="false">闭源权重</option>
          </select>
        </Row>
      </FormSection>

      <FormSection
        title="价格信息"
        description="请按站点约定单位填写，并在保存前核对来源。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <PriceInput
            name="priceInput"
            label="输入价格"
            value={state.priceInput}
            onChange={(value) => update("priceInput", value)}
          />
          <PriceInput
            name="priceOutput"
            label="输出价格"
            value={state.priceOutput}
            onChange={(value) => update("priceOutput", value)}
          />
          <PriceInput
            name="priceCacheRead"
            label="缓存读取价格"
            value={state.priceCacheRead}
            onChange={(value) => update("priceCacheRead", value)}
          />
          <PriceInput
            name="priceCacheWrite"
            label="缓存写入价格"
            value={state.priceCacheWrite}
            onChange={(value) => update("priceCacheWrite", value)}
          />
        </div>
      </FormSection>

      <FormSection
        title="发布设置"
        description="单独设置模型当前状态及观察区置顶展示。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="状态" required>
            <select
              name="status"
              value={state.status}
              onChange={(e) => update("status", e.target.value as ModelStatus)}
              required
              className={inputCls}
            >
              {MODEL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </Row>

          <CheckOption
            name="pinned"
            label="在观察区置顶"
            description="仅影响观察区中的展示顺序。"
            checked={state.pinned}
            onChange={(checked) => update("pinned", checked)}
          />
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
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

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <legend className="px-2 text-base font-semibold">{title}</legend>
      <p className="mb-5 text-sm text-zinc-500">{description}</p>
      {children}
    </fieldset>
  );
}

function CheckOption({
  name,
  label,
  description,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-start gap-3 rounded-md border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
      />
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>}
      </span>
    </label>
  );
}

function PriceInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Row label={label}>
      <input
        name={name}
        type="number"
        min={0}
        step="0.000001"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        inputMode="decimal"
      />
    </Row>
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
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
