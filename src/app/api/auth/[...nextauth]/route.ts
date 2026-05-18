/**
 * Auth.js v5 路由处理
 * 接管 /api/auth/* 的所有请求（signin / callback / signout 等）
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
