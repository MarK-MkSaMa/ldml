/**
 * models.dev 同步
 *
 * 从 models.dev 仓库 models 目录下的 TOML 文件拉取主页 /models 展示的 canonical 模型。
 * 不再把 providers 里的 endpoint/路由商别名单独导入为模型。
 */
import { db } from "@/db";
import { categories, models, syncStates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { suggestSlug } from "./slug";

type GitTreeResponse = {
  tree?: { path?: string; type?: string }[];
};

type CanonicalModelToml = {
  id: string;
  name?: string;
  reasoning?: boolean;
  tool_call?: boolean;
  release_date?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  open_weights?: boolean;
  limit?: {
    context?: number;
    input?: number;
    output?: number;
  };
};

type SyncCandidate = {
  modelsDevId: string;
  name: string;
  slug: string;
  shortSlug: string;
  lab: string;
  categorySlug: "text" | "image" | "video";
  releasedAt: string | null;
  contextTokens: number | null;
  outputTokens: number | null;
  inputModalities: string[] | null;
  outputModalities: string[] | null;
  supportsReasoning: boolean;
  supportsToolCall: boolean;
  openWeights: boolean | null;
  price: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  } | null;
  homepageUrl: string | null;
};

export type ModelsDevSyncResult = {
  fetched: number;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  archived: number;
};

const MODELS_DEV_SYNC_STATE_KEY = "models.dev";
const DEFAULT_MODELS_DEV_LAST_SYNC_AT = new Date("2026-06-30T00:00:00.000Z");

export async function syncModelsFromModelsDev(): Promise<ModelsDevSyncResult> {
  const runStartedAt = new Date();
  const lastSyncedAt = await getModelsDevLastSyncedAt();
  const releaseCutoff = toDateOnly(lastSyncedAt);
  const candidates = (await fetchCanonicalModels()).filter(
    (candidate) => candidate.releasedAt !== null && candidate.releasedAt >= releaseCutoff,
  );

  const [categoryRows, existingRows] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug }).from(categories),
    db
      .select({
        id: models.id,
        slug: models.slug,
        modelsDevId: models.modelsDevId,
        status: models.status,
        categoryId: models.categoryId,
      })
      .from(models),
  ]);

  const categoryIdBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));
  const byModelsDevId = new Map(
    existingRows
      .filter((m) => m.modelsDevId)
      .map((m) => [m.modelsDevId as string, m]),
  );
  const bySlug = new Map(existingRows.map((m) => [m.slug, m]));
  const usedSlugs = new Set(existingRows.map((m) => m.slug));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const archived = 0;

  for (const candidate of candidates) {
    const categoryId = categoryIdBySlug.get(candidate.categorySlug);
    if (!categoryId) {
      skipped++;
      continue;
    }

    const existing =
      byModelsDevId.get(candidate.modelsDevId) ??
      bySlug.get(candidate.slug) ??
      bySlug.get(candidate.shortSlug);

    if (existing) {
      const [row] = await db
        .update(models)
        .set({
          modelsDevId: candidate.modelsDevId,
          name: candidate.name,
          slug: existing.slug,
          categoryId,
          vendor: candidate.lab,
          lab: candidate.lab,
          homepageUrl: candidate.homepageUrl,
          releasedAt: candidate.releasedAt,
          contextTokens: candidate.contextTokens,
          outputTokens: candidate.outputTokens,
          inputModalities: candidate.inputModalities,
          outputModalities: candidate.outputModalities,
          supportsReasoning: candidate.supportsReasoning,
          supportsToolCall: candidate.supportsToolCall,
          openWeights: candidate.openWeights,
          price: candidate.price,
          ...(existing.status === "draft" || existing.status === "archived"
            ? {
                status: "observing" as const,
                publishedAt: new Date(),
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(models.id, existing.id))
        .returning({
          id: models.id,
          slug: models.slug,
          modelsDevId: models.modelsDevId,
          status: models.status,
          categoryId: models.categoryId,
        });
      if (row) {
        byModelsDevId.set(candidate.modelsDevId, row);
        bySlug.set(row.slug, row);
        updated++;
      }
      continue;
    }

    const slug = nextAvailableSlug(candidate.slug, usedSlugs);
    const [row] = await db
      .insert(models)
      .values({
        modelsDevId: candidate.modelsDevId,
        name: candidate.name,
        slug,
        categoryId,
        vendor: candidate.lab,
        lab: candidate.lab,
        homepageUrl: candidate.homepageUrl,
        releasedAt: candidate.releasedAt,
        contextTokens: candidate.contextTokens,
        outputTokens: candidate.outputTokens,
        inputModalities: candidate.inputModalities,
        outputModalities: candidate.outputModalities,
        supportsReasoning: candidate.supportsReasoning,
        supportsToolCall: candidate.supportsToolCall,
        openWeights: candidate.openWeights,
        price: candidate.price,
        status: "observing",
        pinned: false,
        publishedAt: new Date(),
      })
      .returning({
          id: models.id,
          slug: models.slug,
          modelsDevId: models.modelsDevId,
          status: models.status,
          categoryId: models.categoryId,
        });

    if (row) {
      usedSlugs.add(row.slug);
      byModelsDevId.set(candidate.modelsDevId, row);
      bySlug.set(row.slug, row);
      created++;
    }
  }

  await setModelsDevLastSyncedAt(runStartedAt);

  return {
    fetched: candidates.length,
    synced: created + updated,
    created,
    updated,
    skipped,
    archived,
  };
}

const MODELS_DEV_TREE_URL = "https://api.github.com/repos/anomalyco/models.dev/git/trees/dev?recursive=1";
const MODELS_DEV_RAW_BASE = "https://raw.githubusercontent.com/anomalyco/models.dev/dev";

async function getModelsDevLastSyncedAt(): Promise<Date> {
  const [row] = await db
    .select({ lastSyncedAt: syncStates.lastSyncedAt })
    .from(syncStates)
    .where(eq(syncStates.key, MODELS_DEV_SYNC_STATE_KEY));
  return row?.lastSyncedAt ?? DEFAULT_MODELS_DEV_LAST_SYNC_AT;
}

async function setModelsDevLastSyncedAt(value: Date): Promise<void> {
  await db
    .insert(syncStates)
    .values({
      key: MODELS_DEV_SYNC_STATE_KEY,
      lastSyncedAt: value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: syncStates.key,
      set: {
        lastSyncedAt: value,
        updatedAt: new Date(),
      },
    });
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function fetchWithRetry(input: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
    }
  }
  throw lastError;
}

async function fetchCanonicalModels(): Promise<SyncCandidate[]> {
  const response = await fetchWithRetry(MODELS_DEV_TREE_URL, {
    cache: "no-store",
    headers: { accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`models.dev canonical tree 拉取失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GitTreeResponse;
  const modelPaths = (payload.tree ?? [])
    .map((entry) => entry.path)
    .filter((path): path is string =>
      !!path && path.startsWith("models/") && path.endsWith(".toml"),
    )
    .sort();

  const candidates = await Promise.all(
    modelPaths.map(async (modelPath) => {
      const tomlResponse = await fetchWithRetry(`${MODELS_DEV_RAW_BASE}/${modelPath}`, {
        cache: "no-store",
      });
      if (!tomlResponse.ok) return null;
      const toml = await tomlResponse.text();
      const id = modelPath.slice("models/".length, -".toml".length);
      return toCanonicalCandidate(parseCanonicalToml(id, toml));
    }),
  );

  return candidates
    .filter((candidate): candidate is SyncCandidate => candidate !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toCanonicalCandidate(model: CanonicalModelToml): SyncCandidate | null {
  const modelsDevId = model.id.trim();
  const name = model.name?.trim();
  if (!modelsDevId || !name) return null;

  const inputModalities = cleanModalities(model.modalities?.input);
  const outputModalities = cleanModalities(model.modalities?.output);
  const categorySlug = inferCategory(outputModalities);
  if (categorySlug !== "text") return null;

  const lab = inferLab(modelsDevId, null);
  const slug = suggestSlug(modelsDevId.replace(/\//g, "-")) || suggestSlug(name);
  const shortSlug = suggestSlug(modelsDevId.split("/").at(-1) ?? name) || slug;

  return {
    modelsDevId,
    name,
    slug,
    shortSlug,
    lab,
    categorySlug,
    releasedAt: cleanDateString(model.release_date),
    contextTokens: cleanPositiveInt(model.limit?.context),
    outputTokens: cleanPositiveInt(model.limit?.output),
    inputModalities,
    outputModalities,
    supportsReasoning: model.reasoning === true,
    supportsToolCall: model.tool_call === true,
    openWeights: typeof model.open_weights === "boolean" ? model.open_weights : null,
    price: null,
    homepageUrl: `https://models.dev/models/${modelsDevId}`,
  };
}

function parseCanonicalToml(id: string, toml: string): CanonicalModelToml {
  const model: CanonicalModelToml = { id };
  let section: "root" | "limit" | "modalities" | "other" = "root";

  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;

    if (line === "[limit]") {
      section = "limit";
      model.limit ??= {};
      continue;
    }
    if (line === "[modalities]") {
      section = "modalities";
      model.modalities ??= {};
      continue;
    }
    if (line.startsWith("[")) {
      section = "other";
      continue;
    }

    const match = /^(\w+)\s*=\s*(.+)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = parseTomlValue(rawValue);

    if (section === "root") {
      if (key === "name" && typeof value === "string") model.name = value;
      else if (key === "release_date" && typeof value === "string") model.release_date = value;
      else if (key === "reasoning" && typeof value === "boolean") model.reasoning = value;
      else if (key === "tool_call" && typeof value === "boolean") model.tool_call = value;
      else if (key === "open_weights" && typeof value === "boolean") model.open_weights = value;
    } else if (section === "limit") {
      model.limit ??= {};
      if (key === "context" && typeof value === "number") model.limit.context = value;
      else if (key === "input" && typeof value === "number") model.limit.input = value;
      else if (key === "output" && typeof value === "number") model.limit.output = value;
    } else if (section === "modalities") {
      model.modalities ??= {};
      if (key === "input" && isStringArray(value)) model.modalities.input = value;
      else if (key === "output" && isStringArray(value)) model.modalities.output = value;
    }
  }

  return model;
}

function parseTomlValue(value: string): string | number | boolean | string[] | null {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^".*"$/.test(trimmed)) return trimmed.slice(1, -1);
  if (/^\[.*\]$/.test(trimmed)) {
    const body = trimmed.slice(1, -1).trim();
    if (!body) return [];
    return body
      .split(",")
      .map((item) => item.trim())
      .map((item) => (/^".*"$/.test(item) ? item.slice(1, -1) : item))
      .filter(Boolean);
  }
  const numeric = Number(trimmed.replace(/_/g, ""));
  if (Number.isFinite(numeric)) return numeric;
  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function inferCategory(outputModalities: string[] | null): "text" | "image" | "video" | null {
  const output = outputModalities ?? [];
  if (output.includes("video")) return "video";
  if (output.includes("image")) return "image";
  if (output.includes("text")) return "text";
  return null;
}

const LAB_LABELS: Record<string, string> = {
  ai21: "AI21",
  alibaba: "Alibaba",
  anthropic: "Anthropic",
  baidu: "Baidu",
  cohere: "Cohere",
  deepseek: "DeepSeek",
  google: "Google",
  groq: "Groq",
  meta: "Meta",
  microsoft: "Microsoft",
  mistral: "Mistral",
  moonshot: "Moonshot AI",
  openai: "OpenAI",
  qwen: "Qwen",
  xai: "xAI",
  zhipu: "Zhipu AI",
};

function inferLab(modelsDevId: string, fallback: string | null): string {
  const prefix = modelsDevId.split("/")[0]?.toLowerCase();
  if (prefix && LAB_LABELS[prefix]) return LAB_LABELS[prefix];
  if (prefix) return titleCase(prefix.replace(/[-_]+/g, " "));
  return fallback?.trim() || "Unknown";
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanModalities(values?: string[]): string[] | null {
  const cleaned = (values ?? [])
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : null;
}

function cleanPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function cleanDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

function nextAvailableSlug(base: string, used: Set<string>): string {
  let slug = base || "model";
  let i = 2;
  while (used.has(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  used.add(slug);
  return slug;
}
