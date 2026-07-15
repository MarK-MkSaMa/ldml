"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { suggestSlug } from "@/lib/slug";
import { submitModelRequestAction, type ModelRequestFormState } from "./actions";

const initialState: ModelRequestFormState = { ok: false, message: "" };

type WeightValue = "unknown" | "true" | "false";

export function ModelRequestForm({
  categories,
  initialCategoryId,
}: {
  categories: { id: number; name: string; slug: string }[];
  initialCategoryId: number;
}) {
  const [state, formAction, pending] = useActionState(
    submitModelRequestAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [openWeights, setOpenWeights] = useState<WeightValue>("unknown");

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.ok
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          <p>{state.message}</p>
          {state.ok && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/" className="font-medium underline underline-offset-4">
                返回首页
              </Link>
              <Link
                href="/rankings/text"
                className="font-medium underline underline-offset-4"
              >
                查看排行榜
              </Link>
            </div>
          )}
        </div>
      )}

      <FormSection
        title="基本信息"
        description="填写模型名称、分类及可核验的来源信息。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
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

          <Row label="slug" required hint="URL 唯一标识；只能使用小写字母、数字和连字符">
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
              maxLength={80}
              className={inputCls}
              placeholder="OpenAI / Anthropic / Alibaba ..."
            />
          </Row>

          <Row label="官网或文档">
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
        </div>
      </FormSection>

      <FormSection
        title="能力参数"
        description="补充上下文限制、输入输出类型和功能支持情况。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="上下文 tokens">
            <input
              name="contextTokens"
              type="number"
              min={0}
              className={inputCls}
              placeholder="128000"
            />
          </Row>
          <Row label="最大输出 tokens">
            <input
              name="outputTokens"
              type="number"
              min={0}
              className={inputCls}
              placeholder="16384"
            />
          </Row>
          <Row label="输入类型" hint="使用英文逗号分隔，例如 text,image">
            <input name="inputModalities" className={inputCls} placeholder="text,image" />
          </Row>
          <Row label="输出类型" hint="使用英文逗号分隔，例如 text">
            <input name="outputModalities" className={inputCls} placeholder="text" />
          </Row>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <CheckOption name="supportsReasoning" label="支持推理" />
          <CheckOption name="supportsToolCall" label="支持工具调用" />
        </div>
      </FormSection>

      <FormSection
        title="权重信息"
        description="按模型公开情况选择；无法确认时可保留为未知。"
      >
        <Row label="权重开放状态">
          <select
            name="openWeights"
            value={openWeights}
            onChange={(e) => setOpenWeights(e.target.value as WeightValue)}
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
        description="请按站点约定单位填写，并在提交前核对来源。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <PriceInput name="priceInput" label="输入价格" />
          <PriceInput name="priceOutput" label="输出价格" />
          <PriceInput name="priceCacheRead" label="缓存读取价格" />
          <PriceInput name="priceCacheWrite" label="缓存写入价格" />
        </div>
      </FormSection>

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
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
    <fieldset className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <legend className="px-2 text-base font-semibold">{title}</legend>
      <p className="mb-5 text-sm text-zinc-500">{description}</p>
      {children}
    </fieldset>
  );
}

function CheckOption({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800">
      <input
        type="checkbox"
        name={name}
        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
      />
      {label}
    </label>
  );
}

function PriceInput({ name, label }: { name: string; label: string }) {
  return (
    <Row label={label}>
      <input
        name={name}
        type="number"
        min={0}
        step="0.000001"
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
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";
