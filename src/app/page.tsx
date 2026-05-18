import { redirect } from "next/navigation";

export default function Home() {
  // 入口直接进开源文字榜
  redirect("/rankings/closed-source/text");
}
