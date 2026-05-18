/**
 * Markdown 渲染管线
 *
 * 公告、评论共用：
 *   1. 用 marked 解析 Markdown → 原始 HTML
 *   2. 用 DOMPurify 清洗 → 安全 HTML（防 XSS）
 *
 * 允许的标签：基本文本格式 + 链接 + 代码 + 引用 + 列表
 * 不允许：HTML 内嵌 <script> / <style> / <iframe> / 事件属性等
 */
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// 一些 marked 配置
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // 换行直接转 <br>
});

// 清洗白名单
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "del",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
  ],
  ALLOWED_ATTR: ["href", "title", "target", "rel"],
  // 链接强制外开 + nofollow，防止 a 标签滥用
  ADD_ATTR: ["target", "rel"],
};

/**
 * Markdown → 安全 HTML
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const rawHtml = await marked.parse(markdown);
  const clean = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
  // 给所有外链加上 target="_blank" + noopener
  return clean.replace(
    /<a\s+([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/g,
    (_, before, href, after) =>
      `<a ${before}href="${href}" target="_blank" rel="noopener noreferrer nofollow"${after}>`,
  );
}

/**
 * 简单字符长度校验
 * Markdown 原文限制（公告 5000、评论 3000 等，由调用方传入）
 */
export function assertLength(
  text: string,
  max: number,
  field = "内容",
): void {
  if (text.length > max) {
    throw new Error(`${field}超出长度限制（${text.length}/${max}）`);
  }
  if (text.trim().length === 0) {
    throw new Error(`${field}不能为空`);
  }
}
