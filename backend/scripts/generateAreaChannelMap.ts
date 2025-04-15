// DBからチャンネル情報を取得し、エリアごとにsyobocal_cidを分類したマップを生成するスクリプト
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.channel.findMany({
    select: { syobocal_cid: true, area: true }
  });

  const areaMap: Record<string, string[]> = {};
  for (const ch of channels) {
    if (!ch.area || !ch.syobocal_cid) continue;
    if (!areaMap[ch.area]) areaMap[ch.area] = [];
    areaMap[ch.area].push(ch.syobocal_cid);
  }

  const fileContent =
    '// エリアごとにチャンネルsyobocal_cidを分類するマップ（自動生成）\n' +
    'export const areaChannelMap: Record<string, string[]> = ' +
    JSON.stringify(areaMap, null, 2) +
    ';\n';

  const outPath = path.resolve(__dirname, '../src/utils/areaChannelMap.ts');
  writeFileSync(outPath, fileContent, { encoding: 'utf8' });
  console.log('areaChannelMap.ts を生成しました');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });