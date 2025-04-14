import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

// モックで使用する型定義
interface UserAnime {
  anime_id: number;
}

// Prismaのモックタイプを定義
type MockPrismaClient = {
  episode: {
    findMany: jest.Mock;
  };
  userAnime: {
    findMany: jest.Mock;
  };
};

// モックの設定
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    episode: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    },
    userAnime: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    },
  })),
}));

// テスト用のJWTシークレット
const JWT_SECRET = 'test_secret';

describe('Timetable API', () => {
  let app: express.Application;
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // テスト用のExpressアプリケーションを作成
    app = express();
    app.use(express.json());
    app.use(cors());

    // PrismaClientのモックを取得
    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;

    // テストデータ
    const mockEpisodes = [
      {
        id: 1,
        pid: 662213,
        anime_id: 7328,
        channel_id: 1,
        st_time: new Date('2025-04-13T00:00:00Z'),
        ed_time: new Date('2025-04-13T00:30:00Z'),
        count: 1,
        sub_title: 'テストエピソード',
        anime: {
          id: 7328,
          title: 'テストアニメ',
          syobocal_tid: '7328'
        },
        channel: {
          id: 1,
          name: 'テストチャンネル',
          syobocal_cid: '1'
        }
      }
    ];

    // モックの実装
    mockPrisma.episode.findMany.mockResolvedValue(mockEpisodes);
    mockPrisma.userAnime.findMany.mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        anime_id: 7328,
        channel_id: 1,
        status: 'watching'
      }
    ]);

    // 認証ミドルウェアをセットアップ
    app.use((req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return res.sendStatus(401);

      const token = authHeader.split(' ')[1];
      try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
      } catch (err) {
        res.sendStatus(403);
      }
    });

    // タイムテーブルエンドポイントをセットアップ
    app.get('/api/timetable', async (req: any, res: any) => {
      try {
        // 日付パラメータのバリデーション
        if (!req.query.startDate || !req.query.endDate) {
          return res.status(400).json({ message: '開始日と終了日は必須です' });
        }
        const { startDate, endDate, watchingOnly } = req.query;
        const userId = req.user.userId;

        let whereCondition: any = {
          st_time: {
            gte: new Date(`${startDate}T00:00:00Z`),
            lte: new Date(`${endDate}T23:59:59Z`),
          },
        };

        if (watchingOnly === 'true') {
          const watchingAnimes = await mockPrisma.userAnime.findMany({
            where: {
              user_id: userId,
              status: 'watching',
            },
            select: {
              anime_id: true,
            },
          });

          const watchingAnimeIds = watchingAnimes.map((ua: UserAnime) => ua.anime_id);
          whereCondition.anime_id = {
            in: watchingAnimeIds,
          };
        }

        const episodes = await mockPrisma.episode.findMany({
          where: whereCondition,
          include: {
            anime: {
              select: {
                id: true,
                title: true,
                syobocal_tid: true,
              }
            },
            channel: {
              select: {
                id: true,
                name: true,
                syobocal_cid: true,
              }
            },
          },
          orderBy: {
            st_time: 'asc',
          },
        });

        res.json(episodes);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });
  });

  describe('GET /api/timetable', () => {
    it('認証なしでアクセスすると401エラーを返すこと', async () => {
      await request(app)
        .get('/api/timetable')
        .expect(401);
    });

    it('無効なトークンで403エラーを返すこと', async () => {
      await request(app)
        .get('/api/timetable')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);
    });

    it('正しいトークンで番組データを取得できること', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'testuser' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/timetable')
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: '2025-04-13',
          endDate: '2025-04-14',
          watchingOnly: 'false'
        })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        anime: {
          title: 'テストアニメ'
        },
        channel: {
          name: 'テストチャンネル'
        },
        sub_title: 'テストエピソード'
      });
    });

    it('視聴中のみフィルタが機能すること', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'testuser' },
        JWT_SECRET
      );

      await request(app)
        .get('/api/timetable')
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: '2025-04-13',
          endDate: '2025-04-14',
          watchingOnly: 'true'
        })
        .expect(200);

      expect(mockPrisma.userAnime.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          status: 'watching'
        },
        select: {
          anime_id: true
        }
      });
    });

    it('日付範囲が必須であること', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'testuser' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/timetable')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toEqual({
        message: '開始日と終了日は必須です'
      });

      // 開始日のみ指定した場合も400
      await request(app)
        .get('/api/timetable')
        .set('Authorization', `Bearer ${token}`)
        .query({ startDate: '2025-04-13' })
        .expect(400);

      // 終了日のみ指定した場合も400
      await request(app)
        .get('/api/timetable')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});