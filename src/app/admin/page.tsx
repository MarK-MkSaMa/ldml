/**
 * 后台首页（仪表盘占位）
 * 第 15 步会填入真实统计数字
 */
export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
      <p className="mt-2 text-sm text-zinc-500">
        🚧 数据统计待实现（步骤 15）
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {["用户数", "模型数", "评分总数", "公告数"].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-zinc-400">—</div>
          </div>
        ))}
      </div>
    </div>
  );
}
