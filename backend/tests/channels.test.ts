import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const JWT_SECRET = 'test_secret';

type MockPrismaClient = {
  channel: {
    findMany: jest.Mock;
  };
  userChannel: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    channel: {
      findMany: jest.fn(),
    },
    userChannel: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  })),
}));

describe('Channels API', () => {
  let app: express.Application;
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(cors());

    mockPrisma = new PrismaClient() as unknown as MockPrismaClient;

    // 認証ミドルウェア
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

    // /api/channels
    app.get('/api/channels', async (req: any, res: any) => {
      try {
        const channels = await mockPrisma.channel.findMany({
          select: { id: true, name: true, syobocal_cid: true, area: true }
        });
        res.json(channels);
      } catch (err: any) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
      }
    });

    // /api/user/channels GET
    app.get('/api/user/channels', async (req: any, res: any) => {
      try {
        const userId = req.user.userId;
        const userChannels = await mockPrisma.userChannel.findMany({
          where: { user_id: userId },
          include: { channel: { select: { id: true, name: true, syobocal_cid: true, area: true } } }
        });
        res.json(userChannels.map((uc: any) => uc.channel));
      } catch (err: any) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
      }
    });

    // /api/user/channels POST
    app.post('/api/user/channels', async (req: any, res: any) => {
      try {
        const userId = req.user.userId;
        const { channelIds } = req.body;
        if (!Array.isArray(channelIds)) {
          res.status(400).json({ message: 'channelIdsは配列で指定してください' });
          return;
        }
        await mockPrisma.userChannel.deleteMany({ where: { user_id: userId } });
        await mockPrisma.userChannel.createMany({
          data: channelIds.map((channel_id: number) => ({ user_id: userId, channel_id }))
        });
        res.json({ message: 'ユーザーの放送局設定を更新しました' });
      } catch (err: any) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
      }
    });
  });

  describe('GET /api/channels', () => {
    it('認証なしで401エラー', async () => {
      await request(app)
        .get('/api/channels')
        .expect(401);
    });

    it('無効なトークンで403エラー', async () => {
      await request(app)
        .get('/api/channels')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);
    });

    it('正しいトークンで放送局一覧を取得できる', async () => {
      const token = jwt.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
      const mockChannels = [
        { id: 1, name: 'NHK', syobocal_cid: '1', area: '全国' },
        { id: 2, name: 'テレ東', syobocal_cid: '2', area: '関東' }
      ];
      mockPrisma.channel.findMany.mockResolvedValue(mockChannels);

      const res = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual(mockChannels);
      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, syobocal_cid: true, area: true }
      });
    });
  });

  describe('GET /api/user/channels', () => {
    it('認証なしで401エラー', async () => {
      await request(app)
        .get('/api/user/channels')
        .expect(401);
    });

    it('無効なトークンで403エラー', async () => {
      await request(app)
        .get('/api/user/channels')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);
    });

    it('正しいトークンでユーザー選択放送局一覧を取得できる', async () => {
      const token = jwt.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
      const mockUserChannels = [
        { channel: { id: 1, name: 'NHK', syobocal_cid: '1', area: '全国' } },
        { channel: { id: 2, name: 'テレ東', syobocal_cid: '2', area: '関東' } }
      ];
      mockPrisma.userChannel.findMany.mockResolvedValue(mockUserChannels);

      const res = await request(app)
        .get('/api/user/channels')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([
        { id: 1, name: 'NHK', syobocal_cid: '1', area: '全国' },
        { id: 2, name: 'テレ東', syobocal_cid: '2', area: '関東' }
      ]);
      expect(mockPrisma.userChannel.findMany).toHaveBeenCalledWith({
        where: { user_id: 1 },
        include: { channel: { select: { id: true, name: true, syobocal_cid: true, area: true } } }
      });
    });
  });

  describe('POST /api/user/channels', () => {
    it('認証なしで401エラー', async () => {
      await request(app)
        .post('/api/user/channels')
        .send({ channelIds: [1, 2] })
        .expect(401);
    });

    it('無効なトークンで403エラー', async () => {
      await request(app)
        .post('/api/user/channels')
        .set('Authorization', 'Bearer invalid_token')
        .send({ channelIds: [1, 2] })
        .expect(403);
    });

    it('正しいトークンで選択放送局を保存できる', async () => {
      const token = jwt.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
      mockPrisma.userChannel.deleteMany.mockResolvedValue({});
      mockPrisma.userChannel.createMany.mockResolvedValue({});

      const res = await request(app)
        .post('/api/user/channels')
        .set('Authorization', `Bearer ${token}`)
        .send({ channelIds: [1, 2] })
        .expect(200);

      expect(res.body).toEqual({ message: 'ユーザーの放送局設定を更新しました' });
      expect(mockPrisma.userChannel.deleteMany).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(mockPrisma.userChannel.createMany).toHaveBeenCalledWith({
        data: [{ user_id: 1, channel_id: 1 }, { user_id: 1, channel_id: 2 }]
      });
    });

    it('channelIdsが配列でない場合400エラー', async () => {
      const token = jwt.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);

      const res = await request(app)
        .post('/api/user/channels')
        .set('Authorization', `Bearer ${token}`)
        .send({ channelIds: 'not_array' })
        .expect(400);

      expect(res.body).toEqual({ message: 'channelIdsは配列で指定してください' });
    });
  });
});