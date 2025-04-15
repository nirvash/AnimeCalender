// areaChannelMapで分類されていないチャンネルを列挙するスクリプト
import { PrismaClient } from '@prisma/client';
import { areaChannelMap } from '../src/utils/areaChannelMap';

const prisma = new PrismaClient();

async function main() {
  // マップに含まれる全syobocal_cid
  const classified = new Set<string>();
  Object.values(areaChannelMap).forEach(arr => arr.forEach(cid => classified.add(cid)));

  const channels = await prisma.channel.findMany({
    select: { syobocal_cid: true, name: true }
  });

  const unclassified = channels.filter(ch => !classified.has(ch.syobocal_cid));

  if (unclassified.length === 0) {
    console.log('未分類のチャンネルはありません。');
    return;
  }

  console.log('未分類チャンネル一覧:');
  for (const ch of unclassified) {
    console.log(`syobocal_cid: ${ch.syobocal_cid}, name: ${ch.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });