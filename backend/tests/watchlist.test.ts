import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';

// Expressアプリを直接定義
const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

app.use(cors());
app.use(bodyParser.json());

// JWT認証ミドルウェア
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 視聴リスト管理API
app.get('/api/watchlist/watching', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).send();
      return;
    }

    const watchingAnimeIds = await prisma.userAnime.findMany({
      where: {
        user_id: userId,
        status: 'WATCHING',
      },
      select: {
        anime_id: true,
      },
    });

    const episodes = await prisma.episode.findMany({
      where: {
        anime_id: {
          in: watchingAnimeIds.map((ua) => ua.anime_id),
        },
      },
      include: {
        anime: true,
      },
    });

    res.json(episodes);
  } catch (err) {
    console.error('Error fetching watching episodes:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/watchlist/unwatched', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).send();
      return;
    }

    const watchedAnimeIds = await prisma.userAnime.findMany({
      where: { user_id: userId },
      select: { anime_id: true },
    });

    const unwatchedAnimeIds = await prisma.anime.findMany({
      where: {
        id: {
          notIn: watchedAnimeIds.map((ua) => ua.anime_id),
        },
      },
      select: {
        id: true,
      },
    });

    const episodes = await prisma.episode.findMany({
      where: {
        anime_id: {
          in: unwatchedAnimeIds.map((anime) => anime.id),
        },
      },
      include: {
        anime: true,
      },
    });

    res.json(episodes);
  } catch (err) {
    console.error('Error fetching unwatched episodes:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 視聴状態更新API（テスト用）
app.post('/api/watch-status', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    const { episodeId, watched } = req.body;

    if (!userId || !episodeId) {
      res.status(400).json({ message: '必要なパラメータが不足しています' });
      return;
    }

    const episode = await prisma.episode.findUnique({
      where: { pid: episodeId },
      select: { anime_id: true, channel_id: true }
    });

    if (!episode) {
      res.status(404).json({ message: 'エピソードが見つかりません' });
      return;
    }

    await prisma.userAnime.upsert({
      where: {
        user_id_anime_id_channel_id: {
          user_id: userId,
          anime_id: episode.anime_id,
          channel_id: episode.channel_id
        }
      },
      update: {
        last_watched: watched ? new Date() : null,
        status: watched ? 'WATCHED' : 'PLANNED'
      },
      create: {
        user_id: userId,
        anime_id: episode.anime_id,
        channel_id: episode.channel_id,
        status: watched ? 'WATCHED' : 'PLANNED',
        last_watched: watched ? new Date() : null
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('視聴状態更新エラー:', error);
    res.status(500).json({ message: '視聴状態の更新に失敗しました' });
  }
});

beforeAll(async () => {
  // テストデータのセットアップ（外部キー制約を考慮した順序）
  await prisma.episode.deleteMany();
  await prisma.userAnime.deleteMany();
  await prisma.userChannel.deleteMany();
  await prisma.anime.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  // テストユーザーの作成
  const user = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'dummy_hash'
    }
  });

  // テストアニメの作成
  const anime1 = await prisma.anime.create({
    data: {
      title: 'テストアニメ1',
      syobocal_tid: 'TID_1'
    }
  });

  const anime2 = await prisma.anime.create({
    data: {
      title: 'テストアニメ2',
      syobocal_tid: 'TID_2'
    }
  });

  // テストチャンネルの作成
  const channel = await prisma.channel.create({
    data: {
      name: 'テストチャンネル',
      syobocal_cid: 'CID_1',
    }
  });

  // 視聴中のアニメを設定
  await prisma.userAnime.create({
    data: {
      user_id: user.id,
      anime_id: anime1.id,
      channel_id: channel.id,
      status: 'WATCHING'
    }
  });

  // エピソードの作成
  const now = new Date();
  await prisma.episode.create({
    data: {
      anime_id: anime1.id,
      channel_id: channel.id,
      pid: 1001,
      st_time: now,
      ed_time: new Date(now.getTime() + 30 * 60000), // 30分後
      sub_title: 'テストエピソード1',
      last_update: now
    }
  });

  await prisma.episode.create({
    data: {
      anime_id: anime2.id,
      channel_id: channel.id,
      pid: 1002,
      st_time: new Date(now.getTime() + 60 * 60000), // 1時間後
      ed_time: new Date(now.getTime() + 90 * 60000), // 1時間30分後
      sub_title: 'テストエピソード2',
      last_update: now
    }
  });
});

afterAll(async () => {
  // テストデータのクリーンアップ
  await prisma.episode.deleteMany();
  await prisma.userAnime.deleteMany();
  await prisma.userChannel.deleteMany();
  await prisma.anime.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('視聴リスト管理API', () => {
  let jwtToken: string;

  beforeAll(async () => {
    // テストユーザーのJWTトークンを生成
    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    if (!user) throw new Error('Test user not found');
    jwtToken = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
  });

  describe('GET /api/watchlist/watching', () => {
    it('認証なしでアクセスすると401エラー', async () => {
      const res = await request(app).get('/api/watchlist/watching');
      expect(res.status).toBe(401);
    });

    it('認証ありで視聴中リストを取得', async () => {
      const res = await request(app)
        .get('/api/watchlist/watching')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].anime.title).toBe('テストアニメ1');
    });
  });

  describe('GET /api/watchlist/unwatched', () => {
    it('認証なしでアクセスすると401エラー', async () => {
      const res = await request(app).get('/api/watchlist/unwatched');
      expect(res.status).toBe(401);
    });

    it('認証ありで未視聴リストを取得', async () => {
      const res = await request(app)
        .get('/api/watchlist/unwatched')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].anime.title).toBe('テストアニメ2');
    });
  });

  describe('POST /api/watch-status', () => {
    it('認証なしだと401エラー', async () => {
      const res = await request(app)
        .post('/api/watch-status')
        .send({ episodeId: 1001, watched: true });
      expect(res.status).toBe(401);
    });

    it('認証ありで視聴状態を更新できる', async () => {
      const res = await request(app)
        .post('/api/watch-status')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ episodeId: 1001, watched: true });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // DBの状態も確認したい場合はここでuserAnimeを取得して検証可能
    });
  });
});