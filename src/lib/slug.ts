/**
 * slug 工具函数（纯计算，可在客户端和服务端共用）
 */

/**
 * 从名字推荐一个 slug：小写、空格转连字符、非法字符剔除
 */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
