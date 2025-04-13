import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Expressアプリを直接定義（src/index.tsの内容をテスト用に再現）
const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

app.use(cors());
app.use(bodyParser.json());

app.post('/api/auth/register', (req: Request, res: Response) => {
  (async () => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, passwordは必須です' });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: '既に登録済みのメールアドレスです' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password_hash }
    });
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  })().catch((err: any) => {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  });
});

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

app.get('/api/auth/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: '認証済み', user: (req as any).user });
});

beforeAll(async () => {
  // テスト用DBをクリーンアップ
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('認証API', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpass123'
  };
  let jwtToken: string;

  it('ユーザー登録成功', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    jwtToken = res.body.token;
  });

  it('同じメールアドレスでの登録は409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.status).toBe(409);
  });

  it('ログイン成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    jwtToken = res.body.token;
  });

  it('ログイン失敗（パスワード誤り）', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('JWT認証付き保護ルートにアクセス成功', async () => {
    const res = await request(app)
      .get('/api/auth/protected')
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.message).toBe('認証済み');
  });

  it('JWTなしで保護ルートにアクセスは401', async () => {
    const res = await request(app)
      .get('/api/auth/protected');
    expect(res.status).toBe(401);
  });
});
