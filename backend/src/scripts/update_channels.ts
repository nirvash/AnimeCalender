import { PrismaClient } from '@prisma/client';
import { SyobocalClient } from '../services/syobocal/client';

interface SyobocalChannel {
  $: { id: string };
  LastUpdate: string[];
  ChID: string[];
  ChName: string[];
  ChiEPGName?: string[];
  ChURL?: string[];
  ChEPGURL?: string[];
  ChComment?: string[];
  ChGID?: string[];
  ChNumber?: string[];
}

const prisma = new PrismaClient();
const client = new SyobocalClient();

async function updateChannels() {
  try {
    console.log('放送局情報の更新を開始');

    // しょぼいカレンダーAPIから放送局情報を取得
    const channels = await client.getChannels();
    console.log(`取得した放送局数: ${channels.length}`);

    // 新規・更新データを準備
    const channelData = channels.map((ch: SyobocalChannel) => ({
      where: { syobocal_cid: ch.ChID[0] },
      create: {
        syobocal_cid: ch.ChID[0],
        name: ch.ChName[0],
        epg_name: ch.ChiEPGName?.[0] || null,
        url: ch.ChURL?.[0] || null,
        epg_url: ch.ChEPGURL?.[0] || null,
        area: null,
        comment: ch.ChComment?.[0] || null,
        gid: ch.ChGID?.[0] ? parseInt(ch.ChGID[0]) : null,
        number: ch.ChNumber?.[0] ? parseInt(ch.ChNumber[0]) : null,
        last_update: ch.LastUpdate?.[0] ? new Date(ch.LastUpdate[0].replace(/_/g, ' ')) : null
      },
      update: {
        name: ch.ChName[0],
        epg_name: ch.ChiEPGName?.[0] || null,
        url: ch.ChURL?.[0] || null,
        epg_url: ch.ChEPGURL?.[0] || null,
        comment: ch.ChComment?.[0] || null,
        gid: ch.ChGID?.[0] ? parseInt(ch.ChGID[0]) : null,
        number: ch.ChNumber?.[0] ? parseInt(ch.ChNumber[0]) : null,
        last_update: ch.LastUpdate?.[0] ? new Date(ch.LastUpdate[0].replace(/_/g, ' ')) : null
      }
    }));

    // 順次upsert実行
    console.log('放送局データの更新を開始');
    for (const data of channelData) {
      await prisma.channel.upsert(data);
    }

    const updatedCount = await prisma.channel.count({
      where: {
        syobocal_cid: {
          in: channels.map((ch: SyobocalChannel) => ch.ChID[0])
        }
      }
    });

    console.log('放送局データの更新が完了しました');
    console.log(`更新された放送局数: ${updatedCount} / ${channels.length}`);

    // エリア情報が未設定のチャンネル数を表示
    const noAreaCount = await prisma.channel.count({
      where: { area: null }
    });
    if (noAreaCount > 0) {
      console.log(`注意: エリア情報が未設定の放送局が ${noAreaCount} 件あります`);
    }

  } catch (error) {
    console.error('放送局情報の更新中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
updateChannels().catch(e => {
  console.error(e);
  process.exit(1);
});