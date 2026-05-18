/**
 * 编辑公告页
 * 路径：/admin/announcements/[id]
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/lib/announcements";
import { AnnouncementForm } from "../announcement-form";
import { updateAnnouncementAction } from "../actions";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAnnouncementById(id);
  if (!a) notFound();

  // 把 action 包装一下，把 id 闭包进去
  const boundAction = async (formData: FormData) => {
    "use server";
    await updateAnnouncementAction(id, formData);
  };

  return (
    <div>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/admin/announcements" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← 返回公告列表
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">编辑公告</h1>
      <AnnouncementForm
        initial={{
          title: a.title,
          content: a.content,
          isActive: a.isActive,
          isPinned: a.isPinned,
        }}
        action={boundAction}
        submitLabel="保存修改"
      />
    </div>
  );
}
