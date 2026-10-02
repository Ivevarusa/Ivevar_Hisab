import { db } from "./db";

export async function getSetting(key: string, fallback: string) {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getUsdInrRate() {
  return Number(await getSetting("usdInrRate", "88"));
}
