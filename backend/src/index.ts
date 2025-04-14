import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import https from 'https';
import fs from 'fs';

const prisma = new PrismaClient();
const router = express.Router();
const app = express();

const httpsOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
};
const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// CORS設定をより明示的に指定
const allowedOrigin = 'https://bookish-space-capybara-pgr4p9qwvvf9xp5-5173.app.github.dev';

app.use(cors()); // すべてのオリジンを許可
app.use(bodyParser.json());

// カスタム型定義
interface JwtPayload {
  userId: number;
  username: string;
}

interface RequestWithUser extends Request {
  user?: {
    userId: number;
    username: string;
  };
}

// JWT認証ミドルウェア
const authenticateToken = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).send();
    return;
  }

  try {
    console.log('Verifying token:', token);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('Decoded token:', decoded);
    
    // トークンのユーザーIDでDBのユーザー存在確認を追加
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      console.log('User not found in DB:', decoded.userId);
      res.status(401).send();
      return;
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(403).send();
  }
};

// 認証関連のエンドポイント
router.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ message: 'username, email, passwordは必須です' });
      return;
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: '既に登録済みのメールアドレスです' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password_hash }
    });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'email, passwordは必須です' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      return;
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// 視聴リスト管理API
router.get('/api/watchlist/watching', authenticateToken, async (req: RequestWithUser, res: Response) => {
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

router.get('/api/watchlist/unwatched', authenticateToken, async (req: RequestWithUser, res: Response) => {
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
// テスト用の認証保護ルート
router.get('/api/auth/protected', authenticateToken, (req: RequestWithUser, res: Response) => {
  res.json({ message: '認証済み', user: req.user });
});

// タイムテーブルデータ取得API
router.get('/api/timetable', authenticateToken, async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).send();
      return;
    }

    const { startDate, endDate, watchingOnly, channels } = req.query;
    console.log('Received channels parameter:', channels);

    if (!startDate || !endDate) {
      res.status(400).json({ message: 'startDateとendDateは必須です' });
      return;
    }

    const startDateStr = String(startDate);
    const endDateStr = String(endDate);

    // 日本時間として解釈
    const start = new Date(`${startDateStr}T00:00:00+09:00`);
    const end = new Date(`${endDateStr}T23:59:59+09:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: '日付の形式が正しくありません (YYYY-MM-DD)' });
      return;
    }

    let whereCondition: any = {
      st_time: {
        gte: start,
        lte: end,
      }
    };
    
    // チャンネルフィルタの処理
    let channelIds: number[] = [];
    
    if (channels) {
      // URLパラメータから指定されたチャンネルIDをsyobocal_cidに基づいて検索
      const specifiedChannels = await prisma.channel.findMany({
        where: {
          syobocal_cid: {
            in: String(channels).split(',').map(id => id.trim())
          }
        },
        select: { id: true }
      });
      channelIds = specifiedChannels.map(ch => ch.id);
    } else {
      // ユーザーの選択した放送局を取得（従来の動作）
      const userChannels = await prisma.userChannel.findMany({
        where: { user_id: userId },
        select: { channel_id: true }
      });
      channelIds = userChannels.map(uc => uc.channel_id);
    }
    
    if (channelIds.length === 0) {
      res.json([]); // 選択された放送局がない場合は空配列を返す
      return;
    }
    
    // 放送局フィルタを追加
    whereCondition.channel_id = {
      in: channelIds
    };
    
    if (watchingOnly === 'true') {
      const watchingAnimes = await prisma.userAnime.findMany({
        where: { user_id: userId }
      });
    
      if (watchingAnimes.length === 0) {
        res.json([]);
        return;
      }
    
      whereCondition.anime_id = {
        in: watchingAnimes.map(ua => ua.anime_id)
      };
    }

    const episodes = await prisma.episode.findMany({
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

    console.log('🔍 Database Query Condition:', JSON.stringify(whereCondition, null, 2));
    console.log(`🔍 Found ${episodes.length} episodes.`);
    res.json(episodes);
  } catch (err: any) {
    console.error("Error fetching timetable:", err);
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// 放送局一覧取得API
router.get('/api/channels', authenticateToken, async (req: RequestWithUser, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({
      select: { id: true, name: true, syobocal_cid: true, area: true }
    });
    res.json(channels);
  } catch (err: any) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// ユーザーの選択済み放送局一覧取得API
router.get('/api/user/channels', authenticateToken, async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).send();
      return;
    }

    console.log('Fetching channels for user:', userId);
    const userChannels = await prisma.userChannel.findMany({
      where: { user_id: userId },
      include: { channel: { select: { id: true, name: true, syobocal_cid: true, area: true } } }
    });
    res.json(userChannels.map(uc => uc.channel));
  } catch (err: any) {
    console.error('Error fetching user channels:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// ユーザーの選択放送局保存API
router.post('/api/user/channels', authenticateToken, async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).send();
      return;
    }

    const { channelIds } = req.body;
    
    console.log('Updating channels for user:', userId);
    console.log('Requested channel IDs:', channelIds);
    
    if (!Array.isArray(channelIds)) {
      res.status(400).json({ message: 'channelIdsは配列で指定してください' });
      return;
    }

    const existingChannels = await prisma.channel.findMany({
      where: {
        id: {
          in: channelIds
        }
      }
    });

    const validChannelIds = existingChannels.map(ch => ch.id);
    const invalidChannelIds = channelIds.filter(id => !validChannelIds.includes(id));

    if (invalidChannelIds.length > 0) {
      res.status(400).json({
        message: '無効なチャンネルIDが含まれています',
        invalidChannelIds
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.userChannel.deleteMany({
        where: { user_id: userId }
      });

      if (validChannelIds.length > 0) {
        await tx.userChannel.createMany({
          data: validChannelIds.map(channelId => ({
            user_id: userId,
            channel_id: channelId
          }))
        });
      }

      return await tx.userChannel.findMany({
        where: { user_id: userId },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              syobocal_cid: true,
              area: true
            }
          }
        }
      });
    });

    res.json({
      message: 'ユーザーの放送局設定を更新しました',
      channels: result
    });
  } catch (err) {
    console.error('Error in /api/user/channels:', err);
    res.status(500).json({
      message: 'Internal server error',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

app.use(router);

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API server running securely on port ${PORT}`);
});
