// Prismaの全テーブル内容を出力するスクリプト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const animes = await prisma.anime.findMany();
  const channels = await prisma.channel.findMany();
  const userAnimes = await prisma.userAnime.findMany();
  const userChannels = await prisma.userChannel.findMany();
  const episodes = await prisma.episode.findMany();

  console.log('User:', users);
  console.log('Anime:', animes);
  console.log('Channel:', channels);
  console.log('UserAnime:', userAnimes);
  console.log('UserChannel:', userChannels);
  console.log('Episode:', episodes);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });