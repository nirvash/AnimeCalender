import { PrismaClient, Channel } from '@prisma/client';

let prisma = new PrismaClient();

// テスト用にPrismaClientを置き換えられるようにする
export function setPrismaClient(client: PrismaClient) {
  prisma = client;
}

import { areaChannelMap } from '../utils/areaChannelMap';


export async function updateAreas() {
  try {
    console.log('放送局のエリア情報更新を開始');

    let updatedCount = 0;
    // syobocal_cid→エリアの逆引きマップを作成
    const cidToArea = new Map<string, string>();
    for (const [area, cids] of Object.entries(areaChannelMap)) {
      for (const cid of cids) {
        cidToArea.set(cid, area);
      }
    }
    // 全チャンネル取得し、マップに該当するものだけareaを更新
    const channels = await prisma.channel.findMany({ select: { id: true, syobocal_cid: true } });
    for (const ch of channels) {
      const area = cidToArea.get(ch.syobocal_cid);
      if (area) {
        if (!area) {
          console.log(`no area for syobocal_cid: "${ch.syobocal_cid}"`);
        } else {
          const result = await prisma.channel.update({
            where: { id: ch.id },
            data: { area }
          });
          console.log(`updated id: ${ch.id}, syobocal_cid: "${ch.syobocal_cid}", area: ${area}, result.area: ${result.area}`);
          updatedCount++;
        }
      }
    }

    console.log(`エリア情報を更新した放送局数: ${updatedCount}`);

    // 残りの未設定チャンネル数を表示
    const noAreaCount = await prisma.channel.count({
      where: { OR: [ { area: null }, { area: '' } ] }
    });
    if (noAreaCount > 0) {
      console.log(`注意: エリア情報が未設定の放送局が ${noAreaCount} 件あります`);
    }

  } catch (error) {
    console.error('エリア情報の更新中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトとして直接実行された場合のみ処理を開始
if (require.main === module) {
  updateAreas();
}