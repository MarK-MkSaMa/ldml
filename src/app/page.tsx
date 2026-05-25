import { redirect } from "next/navigation";

export default function Home() {
  // 入口直接进文字模型榜
  redirect("/rankings/text");
}
