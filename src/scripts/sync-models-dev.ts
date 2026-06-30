import { syncModelsFromModelsDev } from "@/lib/models-dev-sync";

async function main() {
  const result = await syncModelsFromModelsDev();
  console.log(
    `models.dev 同步完成：拉取 ${result.fetched}，新增 ${result.created}，更新 ${result.updated}，归档 ${result.archived}，跳过 ${result.skipped}`,
  );
}

main().catch((error) => {
  console.error("models.dev 同步失败：", error);
  process.exit(1);
});
