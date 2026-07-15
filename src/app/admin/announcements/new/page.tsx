/**
 * 新建公告页
 */
import Link from "next/link";
import { AnnouncementForm } from "../announcement-form";
import { createAnnouncementAction } from "../actions";

export default function NewAnnouncementPage() {
  return (
    <div className="max-w-4xl">
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/admin/announcements" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← 返回公告列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">新建公告</h1>
      <AnnouncementForm action={createAnnouncementAction} submitLabel="创建" />
    </div>
  );
}
