import { redirect } from "next/navigation";

/**
 * 旧路由兼容：/rankings/[license]/[category]
 * 现在排行榜只按 category 展示，忽略旧 license 段。
 */
export default async function LegacyRankingPage({
  params,
}: {
  params: Promise<{ license: string; category: string }>;
}) {
  const { category } = await params;
  redirect(`/rankings/${category}`);
}
