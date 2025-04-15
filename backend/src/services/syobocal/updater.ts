import { PrismaClient } from '@prisma/client';
import { SyobocalClient } from './client';

// APIレスポンスの型定義
interface SyobocalChannel {
  ChID: string[];
  ChName: string[];
  ChiEPGName: string[];
  ChURL: string[];
  ChEPGURL: string[];
  ChComment: string[];
  ChGID: string[];
  ChNumber: string[];
  LastUpdate: string[];
}

interface SyobocalTitle {
  TID: string[];
  Title: string[];
  LastUpdate: string[];
}

interface SyobocalProgram {
  PID: string[];
  TID: string[];
  ChID: string[];
  StTime: string[];
  EdTime: string[];
  Count: string[];
  SubTitle: string[];
  ProgComment: string[];
  Flag: string[];
  Deleted: string[];
  Warn: string[];
  Revision: string[];
  LastUpdate: string[];
}

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
      // 1. チャンネル情報の更新
      await this.updateChannels();
      
      // 2. アニメ情報の更新
      await this.updateAnimes();
      
      // 3. 番組情報の更新
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
    const channels = await this.client.getChannels() as SyobocalChannel[];

    for (const ch of channels) {
      const id = parseInt(ch.ChID[0]);
      try {
        await this.prisma.channel.upsert({
          where: { id },
          create: {
            id,
            syobocal_cid: ch.ChID[0],
            name: ch.ChName[0],
            epg_name: ch.ChiEPGName[0] || null,
            url: ch.ChURL[0] || null,
            epg_url: ch.ChEPGURL[0] || null,
            comment: ch.ChComment[0] || null,
            gid: ch.ChGID[0] ? parseInt(ch.ChGID[0]) : null,
            number: ch.ChNumber[0] ? parseInt(ch.ChNumber[0]) : null,
            last_update: new Date(ch.LastUpdate[0].replace(/_/g, ' '))
          },
          update: {
            name: ch.ChName[0],
            epg_name: ch.ChiEPGName[0] || null,
            url: ch.ChURL[0] || null,
            epg_url: ch.ChEPGURL[0] || null,
            comment: ch.ChComment[0] || null,
            gid: ch.ChGID[0] ? parseInt(ch.ChGID[0]) : null,
            number: ch.ChNumber[0] ? parseInt(ch.ChNumber[0]) : null,
            last_update: new Date(ch.LastUpdate[0].replace(/_/g, ' '))
          }
        });
      } catch (error) {
        console.error(`Failed to update channel ${id}:`, error);
      }
    }
    console.log('チャンネル情報の更新完了');
  }

  /**
   * アニメ情報を更新
   */
  private async updateAnimes() {
    console.log('アニメ情報の更新開始');
    const titles = await this.client.getTitles();
    console.log(`📝 取得したタイトル数: ${titles.length}`);

    for (const title of titles) {
      try {
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
      } catch (error) {
        console.error(`Failed to update anime ${title.TID[0]}:`, error);
      }
    }
    console.log('アニメ情報の更新完了');
  }

  /**
   * 番組情報を更新
   */
  private async updatePrograms() {
    console.log('番組情報の更新開始');

    // 1週間分の日付範囲を作成
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const dateRange = `${this.formatDate(startDate)}-${this.formatDate(endDate)}`;

    // 番組データを取得
    const programs = await this.client.getPrograms(dateRange) as SyobocalProgram[];
    console.log(`📝 取得した番組数: ${programs.length}`);

    // 番組データに含まれるアニメIDを抽出
    const tids = [...new Set(programs.map(prog => prog.TID[0]))];
    console.log(`📝 関連するアニメ数: ${tids.length}`);
    // アニメ情報を取得（番組に関連するアニメのみ）
    const tidsParam = tids.join(',');
    const titles = await this.client.getTitles(tidsParam) as SyobocalTitle[];
    console.log(`📝 取得したタイトル数: ${titles.length}`);
    // アニメ情報を更新 & 成功したIDを記録
    const registeredAnimeIds = new Map<string, number>();
    for (const title of titles) {
      try {
        // 既存レコードがあればidを取得、なければ新規作成
        const upserted = await this.prisma.anime.upsert({
          where: { syobocal_tid: title.TID[0] },
          create: {
            syobocal_tid: title.TID[0],
            title: title.Title[0]
          },
          update: {
            title: title.Title[0]
          }
        });
        registeredAnimeIds.set(String(title.TID[0]), upserted.id);
      } catch (error) {
        console.error(`Failed to update anime ${title.TID[0]}:`, error);
      }
    }

    // 番組情報を更新
    for (const prog of programs) {
      if (prog.Deleted[0] === '1') {
        console.log(`⏭️ Skipping deleted program: ${prog.PID[0]}`);
        continue;
      }

      const pid = parseInt(prog.PID[0]);
      const animeId = parseInt(prog.TID[0]);
      const channelId = parseInt(prog.ChID[0]);

      try {
        // アニメが登録済みか確認
        const animeIdFromMap = registeredAnimeIds.get(String(prog.TID[0]));
        if (!animeIdFromMap) {
          console.warn(`⚠️ Skipping program ${pid}: anime ${prog.TID[0]} was not registered successfully`);
          continue;
        }

        // チャンネルの存在確認
        const channel = await this.prisma.channel.findUnique({ where: { syobocal_cid: String(channelId) } });
        if (!channel) {
          console.warn(`⚠️ Skipping program ${pid} due to missing channel:`, {
            anime_id: animeId,
            channel_id: channelId
          });
          continue;
        }

        // エピソード情報を更新
        await this.prisma.episode.upsert({
          where: { pid },
          create: {
            pid,
            anime: { connect: { id: animeIdFromMap } },
            channel: { connect: { id: channel.id } },
            st_time: new Date(prog.StTime[0].replace(/_/g, ' ')),
            ed_time: new Date(prog.EdTime[0].replace(/_/g, ' ')),
            count: prog.Count[0] ? parseInt(prog.Count[0]) : null,
            sub_title: prog.SubTitle[0] || null,
            prog_comment: prog.ProgComment[0] || null,
            flag: prog.Flag[0] ? parseInt(prog.Flag[0]) : null,
            deleted: false,
            warn: prog.Warn[0] ? parseInt(prog.Warn[0]) : null,
            revision: prog.Revision[0] ? parseInt(prog.Revision[0]) : null,
            last_update: new Date(prog.LastUpdate[0].replace(/_/g, ' '))
          },
          update: {
            anime: { connect: { id: animeIdFromMap } },
            channel: { connect: { id: channel.id } },
            st_time: new Date(prog.StTime[0].replace(/_/g, ' ')),
            ed_time: new Date(prog.EdTime[0].replace(/_/g, ' ')),
            count: prog.Count[0] ? parseInt(prog.Count[0]) : null,
            sub_title: prog.SubTitle[0] || null,
            prog_comment: prog.ProgComment[0] || null,
            flag: prog.Flag[0] ? parseInt(prog.Flag[0]) : null,
            warn: prog.Warn[0] ? parseInt(prog.Warn[0]) : null,
            revision: prog.Revision[0] ? parseInt(prog.Revision[0]) : null,
            last_update: new Date(prog.LastUpdate[0].replace(/_/g, ' '))
          }
        });
      } catch (error) {
        console.warn(`⚠️ Failed to update program ${pid}:`, error);
      }
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