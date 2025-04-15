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
// Expressアプリを直接定義
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// JWT認証ミドルウェア
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
// 視聴リスト管理API
app.get('/api/watchlist/watching', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).send();
            return;
        }
        const watchingAnimeIds = yield prisma.userAnime.findMany({
            where: {
                user_id: userId,
                status: 'WATCHING',
            },
            select: {
                anime_id: true,
            },
        });
        const episodes = yield prisma.episode.findMany({
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
    }
    catch (err) {
        console.error('Error fetching watching episodes:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
app.get('/api/watchlist/unwatched', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).send();
            return;
        }
        const watchedAnimeIds = yield prisma.userAnime.findMany({
            where: { user_id: userId },
            select: { anime_id: true },
        });
        const unwatchedAnimeIds = yield prisma.anime.findMany({
            where: {
                id: {
                    notIn: watchedAnimeIds.map((ua) => ua.anime_id),
                },
            },
            select: {
                id: true,
            },
        });
        const episodes = yield prisma.episode.findMany({
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
    }
    catch (err) {
        console.error('Error fetching unwatched episodes:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// 視聴状態更新API（テスト用）
app.post('/api/watch-status', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { episodeId, watched } = req.body;
        if (!userId || !episodeId) {
            res.status(400).json({ message: '必要なパラメータが不足しています' });
            return;
        }
        const episode = yield prisma.episode.findUnique({
            where: { pid: episodeId },
            select: { anime_id: true, channel_id: true }
        });
        if (!episode) {
            res.status(404).json({ message: 'エピソードが見つかりません' });
            return;
        }
        yield prisma.userAnime.upsert({
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
    }
    catch (error) {
        console.error('視聴状態更新エラー:', error);
        res.status(500).json({ message: '視聴状態の更新に失敗しました' });
    }
}));
beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // テストデータのセットアップ（外部キー制約を考慮した順序）
    yield prisma.episode.deleteMany();
    yield prisma.userAnime.deleteMany();
    yield prisma.userChannel.deleteMany();
    yield prisma.anime.deleteMany();
    yield prisma.channel.deleteMany();
    yield prisma.user.deleteMany();
    // テストユーザーの作成
    const user = yield prisma.user.create({
        data: {
            username: 'testuser',
            email: 'test@example.com',
            password_hash: 'dummy_hash'
        }
    });
    // テストアニメの作成
    const anime1 = yield prisma.anime.create({
        data: {
            title: 'テストアニメ1',
            syobocal_tid: 'TID_1'
        }
    });
    const anime2 = yield prisma.anime.create({
        data: {
            title: 'テストアニメ2',
            syobocal_tid: 'TID_2'
        }
    });
    // テストチャンネルの作成
    const channel = yield prisma.channel.create({
        data: {
            name: 'テストチャンネル',
            syobocal_cid: 'CID_1',
        }
    });
    // 視聴中のアニメを設定
    yield prisma.userAnime.create({
        data: {
            user_id: user.id,
            anime_id: anime1.id,
            channel_id: channel.id,
            status: 'WATCHING'
        }
    });
    // エピソードの作成
    const now = new Date();
    yield prisma.episode.create({
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
    yield prisma.episode.create({
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
}));
afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // テストデータのクリーンアップ
    yield prisma.episode.deleteMany();
    yield prisma.userAnime.deleteMany();
    yield prisma.userChannel.deleteMany();
    yield prisma.anime.deleteMany();
    yield prisma.channel.deleteMany();
    yield prisma.user.deleteMany();
    yield prisma.$disconnect();
}));
describe('視聴リスト管理API', () => {
    let jwtToken;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // テストユーザーのJWTトークンを生成
        const user = yield prisma.user.findUnique({ where: { email: 'test@example.com' } });
        if (!user)
            throw new Error('Test user not found');
        jwtToken = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    }));
    describe('GET /api/watchlist/watching', () => {
        it('認証なしでアクセスすると401エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app).get('/api/watchlist/watching');
            expect(res.status).toBe(401);
        }));
        it('認証ありで視聴中リストを取得', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/watchlist/watching')
                .set('Authorization', `Bearer ${jwtToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].anime.title).toBe('テストアニメ1');
        }));
    });
    describe('GET /api/watchlist/unwatched', () => {
        it('認証なしでアクセスすると401エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app).get('/api/watchlist/unwatched');
            expect(res.status).toBe(401);
        }));
        it('認証ありで未視聴リストを取得', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/watchlist/unwatched')
                .set('Authorization', `Bearer ${jwtToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].anime.title).toBe('テストアニメ2');
        }));
    });
    describe('POST /api/watch-status', () => {
        it('認証なしだと401エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/watch-status')
                .send({ episodeId: 1001, watched: true });
            expect(res.status).toBe(401);
        }));
        it('認証ありで視聴状態を更新できる', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/watch-status')
                .set('Authorization', `Bearer ${jwtToken}`)
                .send({ episodeId: 1001, watched: true });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            // DBの状態も確認したい場合はここでuserAnimeを取得して検証可能
        }));
    });
});
