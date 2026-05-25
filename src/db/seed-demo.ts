/**
 * 演示数据脚本（仅开发用）
 *
 * 插入若干模型用于页面调试。生产环境不要跑这个脚本。
 *
 * 运行：npm run db:seed-demo
 */
import { db } from "./index";
import { licenses, categories, models, modelStats, dimensions } from "./schema";
import { eq, and } from "drizzle-orm";

type DemoModel = {
  slug: string;
  name: string;
  vendor: string;
  licenseSlug: "open-source" | "closed-source";
  categorySlug: "text" | "image" | "video";
  status?: "listed" | "observing" | "draft";
  // 各维度的演示分数（slug -> 0..10 的均分）
  scores: Record<string, { avg: number; count: number }>;
};

const DEMO: DemoModel[] = [
  // 文字 / 非开源
  {
    slug: "gpt-5",
    name: "GPT-5",
    vendor: "OpenAI",
    licenseSlug: "closed-source",
    categorySlug: "text",
    status: "listed",
    scores: {
      code: { avg: 9.2, count: 412 },
      rp: { avg: 7.8, count: 380 },
      task: { avg: 8.9, count: 401 },
      reasoning: { avg: 9.0, count: 395 },
      "long-context": { avg: 8.5, count: 350 },
      chinese: { avg: 8.0, count: 360 },
    },
  },
  {
    slug: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    vendor: "Anthropic",
    licenseSlug: "closed-source",
    categorySlug: "text",
    status: "listed",
    scores: {
      code: { avg: 9.5, count: 480 },
      rp: { avg: 9.0, count: 420 },
      task: { avg: 9.2, count: 460 },
      reasoning: { avg: 8.8, count: 440 },
      "long-context": { avg: 8.9, count: 430 },
      chinese: { avg: 8.3, count: 410 },
    },
  },
  {
    slug: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    vendor: "Google",
    licenseSlug: "closed-source",
    categorySlug: "text",
    status: "listed",
    scores: {
      code: { avg: 8.6, count: 320 },
      rp: { avg: 7.5, count: 290 },
      task: { avg: 8.4, count: 310 },
      reasoning: { avg: 8.7, count: 305 },
      "long-context": { avg: 9.5, count: 315 },
      chinese: { avg: 8.1, count: 280 },
    },
  },

  // 文字 / 开源
  {
    slug: "deepseek-v3-2",
    name: "DeepSeek V3.2",
    vendor: "DeepSeek",
    licenseSlug: "open-source",
    categorySlug: "text",
    status: "listed",
    scores: {
      code: { avg: 8.9, count: 520 },
      rp: { avg: 8.2, count: 470 },
      task: { avg: 8.5, count: 500 },
      reasoning: { avg: 8.8, count: 510 },
      "long-context": { avg: 8.3, count: 480 },
      chinese: { avg: 9.1, count: 530 },
    },
  },
  {
    slug: "qwen3-coder",
    name: "Qwen3 Coder",
    vendor: "Alibaba",
    licenseSlug: "open-source",
    categorySlug: "text",
    status: "listed",
    scores: {
      code: { avg: 9.0, count: 340 },
      rp: { avg: 6.8, count: 200 },
      task: { avg: 8.6, count: 320 },
      reasoning: { avg: 8.2, count: 280 },
      "long-context": { avg: 8.4, count: 290 },
      chinese: { avg: 9.0, count: 330 },
    },
  },
  {
    slug: "minimax-m2",
    name: "MiniMax M2",
    vendor: "MiniMax",
    licenseSlug: "open-source",
    categorySlug: "text",
    status: "observing",
    scores: {
      code: { avg: 8.4, count: 22 },
      rp: { avg: 8.8, count: 25 },
      task: { avg: 8.2, count: 20 },
    },
  },

  // 生图 / 非开源
  {
    slug: "midjourney-v7",
    name: "Midjourney v7",
    vendor: "Midjourney",
    licenseSlug: "closed-source",
    categorySlug: "image",
    status: "listed",
    scores: {
      realism: { avg: 8.5, count: 200 },
      artistry: { avg: 9.4, count: 220 },
      "prompt-follow": { avg: 8.0, count: 195 },
      speed: { avg: 7.5, count: 180 },
    },
  },

  // 生图 / 开源
  {
    slug: "flux-1-1-pro",
    name: "FLUX 1.1 [pro]",
    vendor: "Black Forest Labs",
    licenseSlug: "open-source",
    categorySlug: "image",
    status: "listed",
    scores: {
      realism: { avg: 9.2, count: 180 },
      artistry: { avg: 8.6, count: 175 },
      "prompt-follow": { avg: 8.8, count: 178 },
      speed: { avg: 8.4, count: 170 },
    },
  },

  // 生视频 / 非开源
  {
    slug: "sora-2",
    name: "Sora 2",
    vendor: "OpenAI",
    licenseSlug: "closed-source",
    categorySlug: "video",
    status: "listed",
    scores: {
      coherence: { avg: 9.0, count: 90 },
      quality: { avg: 9.3, count: 95 },
      "prompt-follow": { avg: 8.7, count: 88 },
      duration: { avg: 7.5, count: 80 },
    },
  },
];

async function seedDemo() {
  console.log("🌱 写入演示模型...\n");

  // 预查 license / category / dimension 的 id
  const allLicenses = await db.select().from(licenses);
  const licenseId = new Map(allLicenses.map((l) => [l.slug, l.id]));
  const allCategories = await db.select().from(categories);
  const categoryId = new Map(allCategories.map((c) => [c.slug, c.id]));
  const allDims = await db.select().from(dimensions);
  // (categorySlug, dimSlug) -> dimId
  const dimId = new Map<string, number>();
  for (const d of allDims) {
    const cat = allCategories.find((c) => c.id === d.categoryId);
    if (cat) dimId.set(`${cat.slug}::${d.slug}`, d.id);
  }

  for (const m of DEMO) {
    const lid = licenseId.get(m.licenseSlug);
    const cid = categoryId.get(m.categorySlug);
    if (!lid || !cid) {
      console.warn(`  ⚠ 跳过 ${m.slug}：找不到 license/category`);
      continue;
    }

    // upsert 模型本体
    const [row] = await db
      .insert(models)
      .values({
        slug: m.slug,
        name: m.name,
        vendor: m.vendor,
        licenseId: lid,
        categoryId: cid,
        status: m.status ?? "listed",
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: models.slug,
        set: {
          name: m.name,
          vendor: m.vendor,
          licenseId: lid,
          categoryId: cid,
          status: m.status ?? "listed",
          updatedAt: new Date(),
        },
      })
      .returning({ id: models.id });
    const modelId = row.id;
    console.log(`  ✓ ${m.slug} (${m.name})`);

    // upsert 各维度的 stats（演示数据：avg 当作 weighted 简化处理）
    for (const [dimSlug, s] of Object.entries(m.scores)) {
      const did = dimId.get(`${m.categorySlug}::${dimSlug}`);
      if (!did) {
        console.warn(`    ⚠ 未找到维度 ${m.categorySlug}/${dimSlug}`);
        continue;
      }
      await db
        .insert(modelStats)
        .values({
          modelId,
          dimensionId: did,
          voteCount: s.count,
          avgScore: s.avg.toFixed(2),
          weightedScore: s.avg.toFixed(2),
        })
        .onConflictDoUpdate({
          target: [modelStats.modelId, modelStats.dimensionId],
          set: {
            voteCount: s.count,
            avgScore: s.avg.toFixed(2),
            weightedScore: s.avg.toFixed(2),
            updatedAt: new Date(),
          },
        });
    }
  }

  // 抑制 unused 警告
  void eq;
  void and;

  console.log("\n✅ 演示数据完成");
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("❌ 失败:", err);
  process.exit(1);
});
