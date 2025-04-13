import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

app.use(cors());
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
    if (!email || !password) {
      return res.status(400).json({ message: 'email, passwordは必須です' });
    }
    // ユーザー検索
    const user = await prisma.user.findUnique({ where: { email } });
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

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});
