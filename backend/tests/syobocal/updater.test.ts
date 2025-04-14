import { PrismaClient } from '@prisma/client';
import { SyobocalUpdater } from '../../src/services/syobocal/updater';
import { SyobocalClient } from '../../src/services/syobocal/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    channel: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null)
    },
    anime: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null)
    },
    episode: {
      upsert: jest.fn().mockResolvedValue({})
    }
  }))
}));

jest.mock('../../src/services/syobocal/client');

describe('SyobocalUpdater', () => {
  let updater: SyobocalUpdater;

  beforeEach(() => {
    jest.clearAllMocks();
    updater = new SyobocalUpdater();

    (updater as any).client = {
      getChannels: jest.fn().mockResolvedValue([]),
      getTitles: jest.fn().mockResolvedValue([]),
      getPrograms: jest.fn().mockResolvedValue([])
    };

    (updater as any).prisma = {
      channel: {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null)
      },
      anime: {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null)
      },
      episode: {
        upsert: jest.fn().mockResolvedValue({})
      }
    };
  });

  describe('updateAnimes', () => {
    it('新規タイトルが正しく登録されること', async () => {
      const mockTitles = [{
        TID: ['1000'],
        Title: ['テストアニメ1'],
        LastUpdate: ['20250413_000000']
      }];

      (updater as any).client.getTitles.mockResolvedValue(mockTitles);

      await (updater as any).updateAnimes();

      expect((updater as any).prisma.anime.upsert).toHaveBeenCalledWith({
        where: { syobocal_tid: '1000' },
        create: {
          syobocal_tid: '1000',
          title: 'テストアニメ1'
        },
        update: {
          title: 'テストアニメ1'
        }
      });
    });

    it('既存タイトルが正しく更新されること', async () => {
      const existingTitle = {
        id: 2000,
        syobocal_tid: '2000',
        title: '更新前のタイトル'
      };

      const mockTitles = [{
        TID: ['2000'],
        Title: ['更新後のタイトル'],
        LastUpdate: ['20250413_000000']
      }];

      (updater as any).prisma.anime.findUnique.mockResolvedValue(existingTitle);
      (updater as any).client.getTitles.mockResolvedValue(mockTitles);

      await (updater as any).updateAnimes();

      expect((updater as any).prisma.anime.upsert).toHaveBeenCalledWith({
        where: { syobocal_tid: '2000' },
        create: {
          syobocal_tid: '2000',
          title: '更新後のタイトル'
        },
        update: {
          title: '更新後のタイトル'
        }
      });
    });

    it('Prisma操作でエラーが発生した場合はエラーログが出力されること', async () => {
      // モックデータ
      const mockTitles = [{
        TID: ['invalid'],
        Title: ['テストアニメ'],
        LastUpdate: ['20250413_000000']
      }];

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      (updater as any).client.getTitles.mockResolvedValue(mockTitles);
      (updater as any).prisma.anime.upsert = jest.fn()
        .mockRejectedValue(new Error('Invalid syobocal_tid format'));

      await (updater as any).updateAnimes();

      const calls = errorSpy.mock.calls;
      expect(
        calls.some(call =>
          call[0].toString().includes('Failed to update anime') &&
          call[1] instanceof Error &&
          call[1].message.includes('Invalid syobocal_tid format')
        )
      ).toBe(true);
      expect((updater as any).prisma.anime.upsert).toHaveBeenCalledWith({
        where: { syobocal_tid: 'invalid' },
        create: expect.any(Object),
        update: expect.any(Object)
      });

      errorSpy.mockReset();
      errorSpy.mockRestore();
    });

    it('DBエラー時も処理を継続すること', async () => {
      const mockTitles = [
        {
          TID: ['1000'],
          Title: ['テストアニメ1'],
          LastUpdate: ['20250413_000000']
        },
        {
          TID: ['1001'],
          Title: ['テストアニメ2'],
          LastUpdate: ['20250413_000000']
        }
      ];
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      (updater as any).client.getTitles.mockResolvedValue(mockTitles);
      // Prisma エラーをシミュレート
      class PrismaClientKnownRequestError extends Error {
        code: string;
        meta?: { target: string[] };
        constructor() {
          super('Unique constraint failed on the constraint: `syobocal_tid`');
          this.name = 'PrismaClientKnownRequestError';
          this.code = 'P2002';
          this.meta = { target: ['syobocal_tid'] };
        }
      }

      (updater as any).prisma.anime.upsert = jest.fn()
        .mockRejectedValueOnce(new PrismaClientKnownRequestError())
        .mockResolvedValueOnce({});

      // debugger; // DBエラー処理のブレークポイント
      await (updater as any).updateAnimes();


      // エラーメッセージが記録されていること
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update anime'),
        expect.any(Error)
      );

      // エラー後も2件目の処理が実行されていること
      expect((updater as any).prisma.anime.upsert).toHaveBeenCalledTimes(2);

      errorSpy.mockRestore();
    });
  });

  describe('formatDate', () => {
    it('日付を正しい形式に変換すること', () => {
      const date = new Date(Date.UTC(2025, 3, 13));
      const result = (updater as any).formatDate(date);
      expect(result).toBe('20250413_000000');
    });
  });
});
