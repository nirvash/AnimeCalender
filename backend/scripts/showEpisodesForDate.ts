import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getDateRangeJST(baseDateStr: string) {
  // JSTでbaseDateの0:00～翌日4:00（28時制）
  const start = new Date(`${baseDateStr}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(4, 0, 0, 0); // 翌4:00
  return { start, end };
}

async function main() {
  const baseDateStr = process.argv[2] || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const userId = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
  const { start, end } = getDateRangeJST(baseDateStr);

  let channelIds: number[] | undefined = undefined;
  if (userId) {
    const userChannels = await prisma.userChannel.findMany({
      where: { user_id: userId },
      select: { channel_id: true }
    });
    channelIds = userChannels.map(uc => uc.channel_id);
    if (channelIds.length === 0) {
      console.log(`User ${userId} has no selected channels.`);
      return;
    }
  }

  const episodes = await prisma.episode.findMany({
    where: {
      st_time: {
        gte: start,
        lt: end,
      },
      ...(channelIds ? { channel_id: { in: channelIds } } : {})
    },
    include: {
      anime: true,
      channel: true,
    },
    orderBy: { st_time: 'asc' },
  });

  console.log(`Episodes for ${baseDateStr} (28h制)${userId ? ` (user=${userId})` : ''}:`);
  episodes.forEach(ep => {
    console.log(
      `[${ep.st_time.toISOString()}] ${ep.anime?.title ?? ''} (${ep.channel?.name ?? ''}) #${ep.count ?? ''} ${ep.sub_title ?? ''}`
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
