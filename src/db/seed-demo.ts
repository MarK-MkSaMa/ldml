/**
 * 演示数据脚本（仅开发用）
 *
 * 插入若干模型用于页面调试。生产环境不要跑这个脚本。
 *
 * 运行：npm run db:seed-demo
 */
import { db } from "./index";
import {
  benchmarkQuestions,
  benchmarkResults,
  categories,
  comments,
  dimensions,
  models,
  modelStats,
  subjectiveTestActivities,
  subjectiveTestEntries,
  subjectiveTestVoteItems,
  subjectiveTestVotes,
  users,
} from "./schema";
import { and, eq } from "drizzle-orm";
import { renderMarkdown } from "@/lib/markdown";

type DemoModel = {
  slug: string;
  name: string;
  vendor: string;
  licenseText?: string;
  categorySlug: "text" | "image" | "video";
  status?: "listed" | "observing" | "draft";
  // 各维度的演示分数（slug -> 0..10 的均分）
  scores: Record<string, { avg: number; count: number }>;
};

const DEMO: DemoModel[] = [
  // 文字模型
  {
    slug: "gpt-5",
    name: "GPT-5",
    vendor: "OpenAI",
    licenseText: "Proprietary",
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
    licenseText: "Proprietary",
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
    licenseText: "Proprietary",
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

  // 文字模型
  {
    slug: "deepseek-v3-2",
    name: "DeepSeek V3.2",
    vendor: "DeepSeek",
    licenseText: "Apache 2.0",
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
    licenseText: "Apache 2.0",
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
    licenseText: "Apache 2.0",
    categorySlug: "text",
    status: "observing",
    scores: {
      code: { avg: 8.4, count: 22 },
      rp: { avg: 8.8, count: 25 },
      task: { avg: 8.2, count: 20 },
    },
  },

  // 生图模型
  {
    slug: "midjourney-v7",
    name: "Midjourney v7",
    vendor: "Midjourney",
    licenseText: "Proprietary",
    categorySlug: "image",
    status: "listed",
    scores: {
      realism: { avg: 8.5, count: 200 },
      artistry: { avg: 9.4, count: 220 },
      "prompt-follow": { avg: 8.0, count: 195 },
      speed: { avg: 7.5, count: 180 },
    },
  },

  // 生图模型
  {
    slug: "flux-1-1-pro",
    name: "FLUX 1.1 [pro]",
    vendor: "Black Forest Labs",
    licenseText: "Apache 2.0",
    categorySlug: "image",
    status: "listed",
    scores: {
      realism: { avg: 9.2, count: 180 },
      artistry: { avg: 8.6, count: 175 },
      "prompt-follow": { avg: 8.8, count: 178 },
      speed: { avg: 8.4, count: 170 },
    },
  },

  // 生视频模型
  {
    slug: "sora-2",
    name: "Sora 2",
    vendor: "OpenAI",
    licenseText: "Proprietary",
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

  // 预查 category / dimension 的 id
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
    const cid = categoryId.get(m.categorySlug);
    if (!cid) {
      console.warn(`  ⚠ 跳过 ${m.slug}：找不到 category`);
      continue;
    }

    // upsert 模型本体
    const [row] = await db
      .insert(models)
      .values({
        slug: m.slug,
        name: m.name,
        vendor: m.vendor,
        licenseText: m.licenseText ?? null,
        categoryId: cid,
        status: m.status ?? "listed",
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: models.slug,
        set: {
          name: m.name,
          vendor: m.vendor,
          licenseText: m.licenseText ?? null,
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

  await seedSampleUsersAndContent(categoryId);

  console.log("\n✅ 演示数据完成");
  process.exit(0);
}

async function seedSampleUsersAndContent(categoryId: Map<string, number>) {
  console.log("\n🌱 写入题库、评论和主观测试样例...");

  const demoUsers = await seedDemoUsers();
  const maintainer = demoUsers[0];
  const voterA = demoUsers[1];
  const voterB = demoUsers[2];
  const voterC = demoUsers[3];

  const modelRows = await db.select().from(models);
  const modelBySlug = new Map(modelRows.map((model) => [model.slug, model]));

  await seedBenchmarkSamples(maintainer.id);
  await seedCommentSamples(modelBySlug, demoUsers);
  await seedSubjectiveTestSamples(categoryId, maintainer.id, [voterA.id, voterB.id, voterC.id]);
}

async function seedDemoUsers() {
  const data = [
    { linuxdoId: 900001, username: "demo-admin", displayName: "演示管理员", trustLevel: 3, isAdmin: true },
    { linuxdoId: 900002, username: "reasoning-fan", displayName: "推理爱好者", trustLevel: 2, isAdmin: false },
    { linuxdoId: 900003, username: "prompt-maker", displayName: "提示词玩家", trustLevel: 2, isAdmin: false },
    { linuxdoId: 900004, username: "model-user", displayName: "模型体验官", trustLevel: 1, isAdmin: false },
  ];

  const rows = [];
  for (const user of data) {
    const [row] = await db
      .insert(users)
      .values({
        linuxdoId: user.linuxdoId,
        username: user.username,
        displayName: user.displayName,
        trustLevel: user.trustLevel,
        isAdmin: user.isAdmin,
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.linuxdoId,
        set: {
          username: user.username,
          displayName: user.displayName,
          trustLevel: user.trustLevel,
          isAdmin: user.isAdmin,
          lastLoginAt: new Date(),
        },
      })
      .returning({ id: users.id, username: users.username });
    rows.push(row);
  }
  console.log(`  ✓ 测试用户 ${rows.length} 个`);
  return rows;
}

async function seedBenchmarkSamples(uploaderId: string) {
  const samples = [
    {
      question: "有 3 个盒子，标签分别是“苹果”“橙子”“苹果和橙子”，但所有标签都贴错了。你只能从一个盒子里拿出一个水果，如何确定所有盒子的真实内容？",
      referenceAnswer: "从标着“苹果和橙子”的盒子拿一个水果。因为标签都错了，该盒子不可能是混合，只能是单一水果；若拿到苹果，则它是苹果盒，标“橙子”的盒子只能是混合，标“苹果”的盒子是橙子。拿到橙子则反之。",
      judgeNote: "需要明确利用“所有标签都错”这一条件，并推出三个盒子的对应关系。",
      results: [
        { modelName: "Claude Sonnet 4.5", isCorrect: true, note: "完整利用标签全错条件。" },
        { modelName: "GPT-5", isCorrect: true, note: "推理链条完整。" },
        { modelName: "Gemini 2.5 Pro", isCorrect: true, note: "答案正确但解释略短。" },
        { modelName: "MiniMax M2", isCorrect: false, note: "把混合盒可能性判断错了。" },
      ],
    },
    {
      question: "一个会议室里有 5 个人，每个人都和其他每个人握手一次。总共发生了多少次握手？请说明计算方式。",
      referenceAnswer: "总共 10 次。每次握手对应一对人，从 5 个人中选 2 人，组合数 C(5,2)=5×4/2=10。",
      judgeNote: "答案必须避免把 A-B 和 B-A 重复计算。",
      results: [
        { modelName: "DeepSeek V3.2", isCorrect: true, note: "组合计算准确。" },
        { modelName: "Qwen3 Coder", isCorrect: true, note: "给出了公式和原因。" },
        { modelName: "GPT-5", isCorrect: true, note: "解释清楚。" },
        { modelName: "MiniMax M2", isCorrect: true, note: "简单题通过。" },
      ],
    },
    {
      question: "请判断下面推理是否有效：所有会飞的动物都有翅膀；企鹅有翅膀；所以企鹅会飞。",
      referenceAnswer: "无效。这是肯定后件/逆命题错误。“会飞 → 有翅膀”不能推出“有翅膀 → 会飞”。企鹅有翅膀并不代表企鹅会飞。",
      judgeNote: "需要指出逻辑谬误，而不仅仅说企鹅不会飞。",
      results: [
        { modelName: "Claude Sonnet 4.5", isCorrect: true, note: "指出了肯定后件。" },
        { modelName: "DeepSeek V3.2", isCorrect: true, note: "解释充分。" },
        { modelName: "Gemini 2.5 Pro", isCorrect: false, note: "只回答企鹅不会飞，未说明推理形式。" },
      ],
    },
  ];

  for (const sample of samples) {
    let [question] = await db
      .select({ id: benchmarkQuestions.id })
      .from(benchmarkQuestions)
      .where(eq(benchmarkQuestions.question, sample.question))
      .limit(1);

    if (!question) {
      [question] = await db
        .insert(benchmarkQuestions)
        .values({
          uploaderId,
          question: sample.question,
          referenceAnswer: sample.referenceAnswer,
          judgeNote: sample.judgeNote,
          status: "approved",
          reviewedBy: uploaderId,
          reviewedAt: new Date(),
        })
        .returning({ id: benchmarkQuestions.id });
    }

    for (const result of sample.results) {
      await db
        .insert(benchmarkResults)
        .values({
          questionId: question.id,
          modelName: result.modelName,
          isCorrect: result.isCorrect,
          modelAnswer: result.isCorrect ? "演示回答：推理过程完整，结论正确。" : "演示回答：结论或推理过程存在遗漏。",
          note: result.note,
          createdBy: uploaderId,
        })
        .onConflictDoUpdate({
          target: [benchmarkResults.questionId, benchmarkResults.modelName],
          set: {
            isCorrect: result.isCorrect,
            modelAnswer: result.isCorrect ? "演示回答：推理过程完整，结论正确。" : "演示回答：结论或推理过程存在遗漏。",
            note: result.note,
            updatedAt: new Date(),
          },
        });
    }
  }
  console.log(`  ✓ 基准测试题目 ${samples.length} 道`);
}

async function seedCommentSamples(
  modelBySlug: Map<string, { id: string; slug: string }>,
  demoUsers: { id: string; username: string }[],
) {
  const samples = [
    { modelSlug: "claude-sonnet-4-5", userIndex: 1, content: "代码解释和重构体验很好，长一点的需求也比较稳。" },
    { modelSlug: "deepseek-v3-2", userIndex: 2, content: "中文表达很自然，日常问答和资料整理的性价比不错。" },
    { modelSlug: "qwen3-coder", userIndex: 3, content: "写 TypeScript 小工具挺顺手，建议多看它在复杂项目里的上下文保持。" },
    { modelSlug: "flux-1-1-pro", userIndex: 1, content: "Prompt 遵循不错，人物细节需要多试几次。" },
  ];

  let count = 0;
  for (const sample of samples) {
    const model = modelBySlug.get(sample.modelSlug);
    const user = demoUsers[sample.userIndex];
    if (!model || !user) continue;

    const existing = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(
        eq(comments.modelId, model.id),
        eq(comments.userId, user.id),
        eq(comments.content, sample.content),
      ))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(comments).values({
      modelId: model.id,
      userId: user.id,
      content: sample.content,
      contentHtml: await renderMarkdown(sample.content),
      likeCount: sample.userIndex + 1,
    });
    count += 1;
  }
  console.log(`  ✓ 评论样例 ${count} 条新增`);
}

async function seedSubjectiveTestSamples(
  categoryId: Map<string, number>,
  createdBy: string,
  voterIds: string[],
) {
  const textCategoryId = categoryId.get("text");
  if (!textCategoryId) {
    console.warn("  ⚠ 找不到 text 分类，跳过主观测试样例");
    return;
  }

  const title = "演示：三模型完成需求拆解任务";
  let [activity] = await db
    .select({ id: subjectiveTestActivities.id })
    .from(subjectiveTestActivities)
    .where(eq(subjectiveTestActivities.title, title))
    .limit(1);

  if (!activity) {
    [activity] = await db
      .insert(subjectiveTestActivities)
      .values({
        categoryId: textCategoryId,
        title,
        requirement: "请把“为模型排行榜新增一个公开题库页面”拆解为可执行开发步骤，要求包含数据、路由、UI 和验证。",
        resultNote: "演示数据：用于测试主观投票列表、详情页和 Elo 排行。",
        linuxdoUrl: "https://linux.do/t/topic/2255927",
        status: "published",
        createdBy,
      })
      .returning({ id: subjectiveTestActivities.id });
  }

  const existingEntries = await db
    .select({ id: subjectiveTestEntries.id, modelName: subjectiveTestEntries.modelName })
    .from(subjectiveTestEntries)
    .where(eq(subjectiveTestEntries.activityId, activity.id));

  const entryByModel = new Map(existingEntries.map((entry) => [entry.modelName, entry.id]));
  const entries = [
    { modelName: "Claude Sonnet 4.5", output: "先确认现有基准测试路由和数据查询函数，再抽取二级菜单组件，新增 questions 页面复用公开题库列表，最后运行 ESLint 并手动检查三条路由。" },
    { modelName: "GPT-5", output: "创建公开题库页面、迁移列表 UI、调整排行榜页只保留排行表、为上传页和题库页设置同一套 tabs，并补充导航测试。" },
    { modelName: "DeepSeek V3.2", output: "实现步骤：1. 查找页面；2. 拆分题库页面；3. 修改二级菜单；4. 删除重复按钮；5. 检查功能与样式。" },
  ];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entryByModel.has(entry.modelName)) continue;
    const [created] = await db
      .insert(subjectiveTestEntries)
      .values({
        activityId: activity.id,
        modelName: entry.modelName,
        output: entry.output,
        order: i + 1,
      })
      .returning({ id: subjectiveTestEntries.id });
    entryByModel.set(entry.modelName, created.id);
  }

  const rankings = [
    ["Claude Sonnet 4.5", "GPT-5", "DeepSeek V3.2"],
    ["GPT-5", "Claude Sonnet 4.5", "DeepSeek V3.2"],
    ["Claude Sonnet 4.5", "DeepSeek V3.2", "GPT-5"],
  ];

  for (let i = 0; i < voterIds.length; i++) {
    const voterId = voterIds[i];
    const [vote] = await db
      .insert(subjectiveTestVotes)
      .values({ activityId: activity.id, userId: voterId })
      .onConflictDoUpdate({
        target: [subjectiveTestVotes.activityId, subjectiveTestVotes.userId],
        set: { updatedAt: new Date() },
      })
      .returning({ id: subjectiveTestVotes.id });

    for (let rank = 0; rank < rankings[i].length; rank++) {
      const entryId = entryByModel.get(rankings[i][rank]);
      if (!entryId) continue;
      await db
        .insert(subjectiveTestVoteItems)
        .values({ voteId: vote.id, entryId, rank: rank + 1 })
        .onConflictDoUpdate({
          target: [subjectiveTestVoteItems.voteId, subjectiveTestVoteItems.entryId],
          set: { rank: rank + 1 },
        });
    }
  }
  console.log("  ✓ 主观测试活动 1 个，含 3 个模型输出和 3 组投票");
}

seedDemo().catch((err) => {
  console.error("❌ 失败:", err);
  process.exit(1);
});
