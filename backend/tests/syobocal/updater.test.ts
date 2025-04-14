import { PrismaClient } from '@prisma/client';
import { SyobocalUpdater } from '../../src/services/syobocal/updater';
import { SyobocalClient } from '../../src/services/syobocal/client';

// モックの作成
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    channel: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    anime: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    episode: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  })),
}));

jest.mock('../../src/services/syobocal/client');

describe('SyobocalUpdater', () => {
  let updater: SyobocalUpdater;
  let mockPrismaClient: jest.Mocked<PrismaClient>;
  let mockSyobocalClient: jest.Mocked<SyobocalClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    updater = new SyobocalUpdater();
    mockPrismaClient = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockSyobocalClient = new SyobocalClient() as jest.Mocked<SyobocalClient>;
  });

  describe('updateAll', () => {
    it('全データの更新が正常に完了すること', async () => {
      // チャンネル情報のモックデータ（全てのフィールドを含む）
      const mockChannels = [{
        ChID: ['1'],
        ChName: ['テストチャンネル'],
        ChiEPGName: ['テストＣＨ'],
        ChURL: ['https://example.com'],
        ChEPGURL: ['https://example.com/epg'],
        ChComment: ['テストコメント'],
        ChGID: ['1'],
        ChNumber: ['1'],
        LastUpdate: ['20250413_000000'],
      }];

      // アニメ情報のモックデータ
      const mockTitles = [{
        TID: ['7328'],
        Title: ['テストアニメ'],
      }];

      // 番組情報のモックデータ
      const mockPrograms = [{
        PID: ['662213'],
        TID: ['7328'],
        ChID: ['1'],
        StTime: ['20250413_000000'],
        EdTime: ['20250413_003000'],
        Count: ['1'],
        SubTitle: ['テストエピソード'],
        ProgComment: ['テストコメント'],
        Flag: ['0'],
        Deleted: ['0'],
        Warn: ['0'],
        Revision: ['0'],
        LastUpdate: ['20250413_000000'],
      }];

      // モックの設定
      // SyobocalClientのメソッドをモック化
      (updater as any).client = {
        getChannels: jest.fn().mockResolvedValue(mockChannels),
        getTitles: jest.fn().mockResolvedValue(mockTitles),
        getPrograms: jest.fn().mockResolvedValue(mockPrograms)
      };

      // PrismaClientのメソッドをモック化
      (updater as any).prisma = {
        channel: { upsert: jest.fn().mockResolvedValue({}) },
        anime: { upsert: jest.fn().mockResolvedValue({}) },
        episode: { upsert: jest.fn().mockResolvedValue({}) }
      };

      await updater.updateAll();

      // チャンネル情報の更新確認
      expect((updater as any).prisma.channel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { syobocal_cid: '1' },
          create: expect.objectContaining({
            syobocal_cid: '1',
            name: 'テストチャンネル',
          }),
        })
      );

      // アニメ情報の更新確認
      expect((updater as any).prisma.anime.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { syobocal_tid: '7328' },
          create: expect.objectContaining({
            syobocal_tid: '7328',
            title: 'テストアニメ',
          }),
        })
      );

      // 番組情報の更新確認
      expect((updater as any).prisma.episode.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pid: 662213 },
          create: expect.objectContaining({
            pid: 662213,
            anime_id: 7328,
            channel_id: 1,
            count: 1,
            sub_title: 'テストエピソード',
          }),
        })
      );
    });

    it('エラー時に例外をスローすること', async () => {
      const error = new Error('テストエラー');
      (updater as any).client.getChannels.mockRejectedValueOnce(error);

      await expect(updater.updateAll()).rejects.toThrow('テストエラー');
    });
  });

  describe('formatDate', () => {
    it('日付を正しい形式に変換すること', () => {
      // UTCで2025年4月13日 00:00:00を指定
      const date = new Date(Date.UTC(2025, 3, 13));
      const result = updater['formatDate'](date);
      expect(result).toBe('20250413_000000');
    });
  });
});