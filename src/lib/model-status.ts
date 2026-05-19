/**
 * 模型状态枚举（独立模块，可在客户端 import）
 *
 * 与 src/db/schema.ts 中的 modelStatusEnum 必须保持一致。
 * 拆出来避免客户端组件因为 import schema.ts 间接拉入 drizzle/postgres 驱动。
 */
export const MODEL_STATUSES = ["draft", "observing", "listed", "archived"] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];
