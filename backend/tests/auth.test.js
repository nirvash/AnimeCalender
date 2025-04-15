"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Expressアプリを直接定義（src/index.tsの内容をテスト用に再現）
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.post('/api/auth/register', (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'username, email, passwordは必須です' });
        }
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: '既に登録済みのメールアドレスです' });
        }
        const password_hash = yield bcryptjs_1.default.hash(password, 10);
        const user = yield prisma.user.create({
            data: { username, email, password_hash }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
    }))().catch((err) => {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    });
});
app.post('/api/auth/login', (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'email, passwordは必須です' });
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
        }
        const valid = yield bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    }))().catch((err) => {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    });
});
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.sendStatus(401);
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.sendStatus(403);
        req.user = user;
        next();
    });
}
app.get('/api/auth/protected', authenticateToken, (req, res) => {
    res.json({ message: '認証済み', user: req.user });
});
beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // テスト用DBをクリーンアップ（外部キー制約を考慮した順序）
    yield prisma.userAnime.deleteMany();
    yield prisma.userChannel.deleteMany();
    yield prisma.user.deleteMany();
}));
afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
describe('認証API', () => {
    const testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123'
    };
    let jwtToken;
    it('ユーザー登録成功', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send(testUser);
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(testUser.email);
        jwtToken = res.body.token;
    }));
    it('同じメールアドレスでの登録は409', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send(testUser);
        expect(res.status).toBe(409);
    }));
    it('ログイン成功', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(testUser.email);
        jwtToken = res.body.token;
    }));
    it('ログイン失敗（パスワード誤り）', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: 'wrongpass' });
        expect(res.status).toBe(401);
    }));
    it('JWT認証付き保護ルートにアクセス成功', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
            .get('/api/auth/protected')
            .set('Authorization', `Bearer ${jwtToken}`);
        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.message).toBe('認証済み');
    }));
    it('JWTなしで保護ルートにアクセスは401', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app)
            .get('/api/auth/protected');
        expect(res.status).toBe(401);
    }));
});
