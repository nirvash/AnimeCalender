// DBからチャンネル情報（syobocal_cid, name, area）を一覧表示するスクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.channel.findMany({
    select: { syobocal_cid: true, name: true, area: true }
  });

  for (const ch of channels) {
    console.log(
      `syobocal_cid: ${ch.syobocal_cid}, name: ${ch.name}, area: ${ch.area ?? ''}`
    );
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