/**
 * 评论相关 API 共用工具
 */
import type { CommentError } from "@/lib/comments";

export function codeToStatus(code: CommentError["code"]): number {
  switch (code) {
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "RATE_LIMIT":
      return 429;
    case "EDIT_WINDOW_EXPIRED":
    case "BLOCKED_BY_KEYWORD":
    case "INVALID":
      return 400;
    default:
      return 400;
  }
}
