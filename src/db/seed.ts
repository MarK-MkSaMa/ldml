/**
 * 种子数据脚本
 *
 * 往数据库里插入配置型初始数据：
 *   - 大类（licenses）
 *   - 分类（categories）
 *   - 维度（dimensions）
 *
 * 可重复运行，存在则更新（基于 slug）。
 *
 * 运行：npm run db:seed
 */
import { db } from "./index";
import { licenses, categories, dimensions } from "./schema";

// ---------- 数据定义 ----------

const LICENSES = [
  { slug: "open-source", name: "开源", order: 1 },
  { slug: "closed-source", name: "非开源", order: 2 },
] as const;

const CATEGORIES = [
  { slug: "text", name: "文字模型", order: 1 },
  { slug: "image", name: "生图模型", order: 2 },
  { slug: "video", name: "生视频模型", order: 3 },
] as const;

// 各分类的维度（对应方案文档 § 3.2）
const DIMENSIONS: Record<
  (typeof CATEGORIES)[number]["slug"],
  { slug: string; name: string; description: string }[]
> = {
  text: [
    { slug: "code", name: "代码能力", description: "代码生成、调试、补全的综合表现" },
    { slug: "rp", name: "RP 能力", description: "角色扮演时是否遵从背景逻辑、人设连贯" },
    { slug: "task", name: "任务执行", description: "Agent / 工具调用 / 复杂指令遵循" },
    { slug: "reasoning", name: "推理能力", description: "数学、逻辑、多步推理" },
    { slug: "long-context", name: "长文本", description: "长上下文阅读 / 处理 / 总结" },
    { slug: "chinese", name: "中文表达", description: "中文流畅度、地道度、文化理解" },
  ],
  image: [
    { slug: "realism", name: "写实度", description: "照片级真实感、细节准确度" },
    { slug: "artistry", name: "艺术性", description: "构图、色彩、风格表现力" },
    { slug: "prompt-follow", name: "Prompt 遵循", description: "对提示词中元素、属性的准确还原" },
    { slug: "speed", name: "出图速度", description: "出图速度 / 单图耗时" },
  ],
  video: [
    { slug: "coherence", name: "画面连贯性", description: "帧间过渡平滑、无明显跳变" },
    { slug: "quality", name: "画质", description: "分辨率、清晰度、细节" },
    { slug: "prompt-follow", name: "Prompt 遵循", description: "对提示词中场景、动作的还原" },
    { slug: "duration", name: "时长能力", description: "支持的最长视频时长与稳定性" },
  ],
};

// ---------- 执行逻辑 ----------

async function seed() {
  console.log("🌱 开始种子数据...\n");

  // 1. 大类（按 slug upsert）
  console.log("[1/3] 写入大类...");
  for (const item of LICENSES) {
    await db
      .insert(licenses)
      .values(item)
      .onConflictDoUpdate({
        target: licenses.slug,
        set: { name: item.name, order: item.order },
      });
    console.log(`  ✓ ${item.slug} (${item.name})`);
  }

  // 2. 分类
  console.log("\n[2/3] 写入分类...");
  for (const item of CATEGORIES) {
    await db
      .insert(categories)
      .values(item)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: item.name, order: item.order },
      });
    console.log(`  ✓ ${item.slug} (${item.name})`);
  }

  // 3. 维度（要先查 category_id，因为外键关系）
  console.log("\n[3/3] 写入维度...");
  const allCategories = await db.select().from(categories);
  const categoryIdMap = new Map(allCategories.map((c) => [c.slug, c.id]));

  for (const [categorySlug, dims] of Object.entries(DIMENSIONS)) {
    const categoryId = categoryIdMap.get(categorySlug);
    if (!categoryId) {
      console.warn(`  ⚠ 找不到分类 ${categorySlug}，跳过`);
      continue;
    }
    for (let i = 0; i < dims.length; i++) {
      const dim = dims[i];
      // dimensions 的唯一约束是 (category_id, slug) 组合，需要用 SQL 表达
      await db
        .insert(dimensions)
        .values({
          categoryId,
          slug: dim.slug,
          name: dim.name,
          description: dim.description,
          order: i + 1,
        })
        .onConflictDoUpdate({
          target: [dimensions.categoryId, dimensions.slug],
          set: {
            name: dim.name,
            description: dim.description,
            order: i + 1,
          },
        });
      console.log(`  ✓ ${categorySlug} / ${dim.slug} (${dim.name})`);
    }
  }

  console.log("\n✅ 种子数据完成");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ 种子失败:", err);
  process.exit(1);
});
