import { PrismaClient } from '@prisma/client';
import { SyobocalClient } from './client';

export class SyobocalUpdater {
  private prisma: PrismaClient;
  private client: SyobocalClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.client = new SyobocalClient();
  }

  /**
   * 全データの更新を実行
   */
  async updateAll() {
    console.log('データ更新開始');
    
    try {
      // チャンネル情報の更新
      await this.updateChannels();
      
      // 番組情報の更新
      await this.updatePrograms();

      console.log('データ更新完了');
    } catch (error) {
      console.error('データ更新エラー:', error);
      throw error;
    }
  }

  /**
   * チャンネル情報を更新
   */
  private async updateChannels() {
    console.log('チャンネル情報の更新開始');
    const channels = await this.client.getChannels();

    for (const ch of channels) {
      await (this.prisma as any).channel.upsert({
        where: { syobocal_cid: ch.ChID[0] } as any,
        create: {
          syobocal_cid: ch.ChID[0],
          name: ch.ChName[0],
          epg_name: ch.ChiEPGName[0] || null,
          url: ch.ChURL[0] || null,
          epg_url: ch.ChEPGURL[0] || null,
          comment: ch.ChComment[0] || null,
          gid: ch.ChGID[0] ? parseInt(ch.ChGID[0]) : null,
          number: ch.ChNumber[0] ? parseInt(ch.ChNumber[0]) : null,
          last_update: new Date(ch.LastUpdate[0])
        },
        update: {
          name: ch.ChName[0],
          epg_name: ch.ChiEPGName[0] || null,
          url: ch.ChURL[0] || null,
          epg_url: ch.ChEPGURL[0] || null,
          comment: ch.ChComment[0] || null,
          gid: ch.ChGID[0] ? parseInt(ch.ChGID[0]) : null,
          number: ch.ChNumber[0] ? parseInt(ch.ChNumber[0]) : null,
          last_update: new Date(ch.LastUpdate[0])
        }
      });
    }
    console.log('チャンネル情報の更新完了');
  }

  /**
   * 番組情報を更新
   */
  private async updatePrograms() {
    console.log('番組情報の更新開始');
    
    // 今日から1週間分の日付範囲を生成
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    
    // YYYYMMDD_HHMMSS形式に変換
    const range = `${this.formatDate(start)}-${this.formatDate(end)}`;
    
    const programs = await this.client.getPrograms(range);
    const titles = await this.client.getTitles();

    // タイトル情報の更新
    for (const title of titles) {
      console.log('📝 Processing title:', {
        tid: title.TID[0],
        title: title.Title[0]
      });
      await (this.prisma as any).anime.upsert({
        where: { syobocal_tid: title.TID[0] } as any,
        create: {
          syobocal_tid: title.TID[0],
          title: title.Title[0]
        },
        update: {
          title: title.Title[0]
        }
      });
    }

    // 放送予定の更新
    for (const prog of programs) {
      if (prog.Deleted[0] === '1') continue; // 削除フラグのある番組はスキップ
      
      await this.prisma.episode.upsert({
        where: { pid: parseInt(prog.PID[0]) },
        create: {
          pid: parseInt(prog.PID[0]),
          anime_id: parseInt(prog.TID[0]), // Assuming anime and channel already exist from updateChannels/updateTitles
          channel_id: parseInt(prog.ChID[0]),
          st_time: new Date(prog.StTime[0]), // Assuming API returns 'YYYY-MM-DD HH:MM:SS'
          ed_time: new Date(prog.EdTime[0]), // Assuming API returns 'YYYY-MM-DD HH:MM:SS'
          count: prog.Count[0] ? parseInt(prog.Count[0]) : null,
          sub_title: prog.SubTitle[0] || null,
          prog_comment: prog.ProgComment[0] || null,
          flag: prog.Flag[0] ? parseInt(prog.Flag[0]) : null,
          deleted: false,
          warn: prog.Warn[0] ? parseInt(prog.Warn[0]) : null,
          revision: prog.Revision[0] ? parseInt(prog.Revision[0]) : null,
          last_update: new Date(prog.LastUpdate[0])
        },
        update: {
          st_time: new Date(prog.StTime[0]), // Assuming API returns 'YYYY-MM-DD HH:MM:SS'
          ed_time: new Date(prog.EdTime[0]), // Assuming API returns 'YYYY-MM-DD HH:MM:SS'
          count: prog.Count[0] ? parseInt(prog.Count[0]) : null,
          sub_title: prog.SubTitle[0] || null,
          prog_comment: prog.ProgComment[0] || null,
          flag: prog.Flag[0] ? parseInt(prog.Flag[0]) : null,
          warn: prog.Warn[0] ? parseInt(prog.Warn[0]) : null,
          revision: prog.Revision[0] ? parseInt(prog.Revision[0]) : null,
          last_update: new Date(prog.LastUpdate[0])
        }
      });
    }
    console.log('番組情報の更新完了');
  }

  /**
   * 日付をYYYYMMDD_HHMMSS形式に変換
   */
 private formatDate(date: Date): string {
   return date.toISOString()
     .replace(/[-:]/g, '')
     .replace(/\.\d+/, '')
     .replace('T', '_')
     .replace('Z', ''); // タイムゾーン指示子を削除
 }
}