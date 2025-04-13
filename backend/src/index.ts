import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import https from 'https';
import fs from 'fs';

const app = express();
const httpsOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
};
const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// CORS設定をより明示的に指定
const allowedOrigin = 'https://bookish-space-capybara-pgr4p9qwvvf9xp5-5173.app.github.dev';

app.use(cors({
  origin: '*', // すべてのオリジンを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 許可するHTTPメソッド
  allowedHeaders: ['Content-Type', 'Authorization'], // 許可するヘッダー
}));

app.use(bodyParser.json());

// 認証APIルート雛形
app.post('/api/auth/register', (req: Request, res: Response) => {
  (async () => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, passwordは必須です' });
    }
    // email重複チェック
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: '既に登録済みのメールアドレスです' });
    }
    // パスワードハッシュ化
    const password_hash = await bcrypt.hash(password, 10);
    // ユーザー作成
    const user = await prisma.user.create({
      data: { username, email, password_hash }
    });
    // JWT発行
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
  })().catch((err: any) => {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  (async () => {
    const { email, password } = req.body;
    console.log('Debug: Received login request with email:', email); // デバッグログを追加
    if (!email || !password) {
      return res.status(400).json({ message: 'email, passwordは必須です' });
    }
    // ユーザー検索
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('Debug: User found:', user); // デバッグログを追加
    if (!user) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }
    // パスワード照合
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }
    // JWT発行
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  })().catch((err: any) => {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  });
});

// JWT認証ミドルウェア雛形
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

// テスト用の認証保護ルート
app.get('/api/auth/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: '認証済み', user: (req as any).user });
});

// タイムテーブルデータ取得API
app.get('/api/timetable', authenticateToken, (req: Request, res: Response) => {
  console.log('🚨 timetable endpoint hit');
  console.log('🚨 user:', (req as any).user);
  console.log('🚨 query:', req.query);
  
  (async () => {
    const userId = (req as any).user.userId;
    const { startDate, endDate, watchingOnly } = req.query; // YYYY-MM-DD形式を想定

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDateとendDateは必須です' });
    }

    try {
      // クエリパラメータがstring | string[] | qs.ParsedQs | qs.ParsedQs[] 型の可能性があるため、stringにキャスト
      const startDateStr = String(startDate);
      const endDateStr = String(endDate);

      const start = new Date(`${startDateStr}T00:00:00Z`); // UTCとして解釈
      const end = new Date(`${endDateStr}T23:59:59Z`);   // UTCとして解釈

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: '日付の形式が正しくありません (YYYY-MM-DD)' });
      }

      let whereCondition: any = {
        st_time: {
          gte: start,
          lte: end, // 終了日の終わりまでを含む開始時間の番組を取得
        },
        // ed_timeではなくst_timeで範囲を絞る（開始時間基準）
        // ed_time <= end だと、期間を跨ぐ番組が取得できない可能性があるため
        // 例えば 4/13 23:30 - 4/14 00:00 の番組を 4/13 で検索したい場合など
        // st_time <= end の方が直感的か？ 要件次第で調整
      };

      // 視聴中のみ絞り込み
      if (watchingOnly === 'true') {
        const watchingAnimes = await prisma.userAnime.findMany({
          where: {
            user_id: userId,
            status: 'watching',
          },
          select: {
            anime_id: true,
          },
        });
        const watchingAnimeIds = watchingAnimes.map(ua => ua.anime_id);

        if (watchingAnimeIds.length === 0) {
          // 視聴中のアニメがない場合は空配列を返す
          return res.json([]);
        }

        // AND条件として anime_id の絞り込みを追加
        whereCondition.anime_id = {
          in: watchingAnimeIds,
        };
      }

      const episodes = await prisma.episode.findMany({
        where: whereCondition,
        include: {
          anime: { // Anime情報を含める
            select: {
              id: true,
              title: true,
              syobocal_tid: true,
            }
          },
          channel: { // Channel情報を含める
            select: {
              id: true,
              name: true,
              syobocal_cid: true,
            }
          },
        },
        orderBy: {
          st_time: 'asc', // 開始時間でソート
        },
      });

      res.json(episodes);

    } catch (err: any) {
      console.error("Error fetching timetable:", err); // エラーログを強化
      console.error(err.stack); // スタックトレースも出力
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  })().catch((err: any) => {
    // 非同期処理全体のエラーハンドリング
    console.error("Unhandled error in /api/timetable:", err); // エラーログを強化
    console.error(err.stack); // スタックトレースも出力
    res.status(500).json({ message: 'Internal server error', error: err.message });
  });
});


https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API server running securely on port ${PORT}`);
});