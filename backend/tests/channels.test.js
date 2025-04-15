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
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const JWT_SECRET = 'test_secret';
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
    let app;
    let mockPrisma;
    beforeEach(() => {
        jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((0, cors_1.default)());
        mockPrisma = new client_1.PrismaClient();
        // 認証ミドルウェア
        app.use((req, res, next) => {
            const authHeader = req.headers['authorization'];
            if (!authHeader)
                return res.sendStatus(401);
            const token = authHeader.split(' ')[1];
            try {
                const user = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                req.user = user;
                next();
            }
            catch (err) {
                res.sendStatus(403);
            }
        });
        // /api/channels
        app.get('/api/channels', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const channels = yield mockPrisma.channel.findMany({
                    select: { id: true, name: true, syobocal_cid: true, area: true }
                });
                res.json(channels);
            }
            catch (err) {
                res.status(500).json({ message: 'Internal server error', error: err.message });
            }
        }));
        // /api/user/channels GET
        app.get('/api/user/channels', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const userId = req.user.userId;
                const userChannels = yield mockPrisma.userChannel.findMany({
                    where: { user_id: userId },
                    include: { channel: { select: { id: true, name: true, syobocal_cid: true, area: true } } }
                });
                res.json(userChannels.map((uc) => uc.channel));
            }
            catch (err) {
                res.status(500).json({ message: 'Internal server error', error: err.message });
            }
        }));
        // /api/user/channels POST
        app.post('/api/user/channels', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const userId = req.user.userId;
                const { channelIds } = req.body;
                if (!Array.isArray(channelIds)) {
                    res.status(400).json({ message: 'channelIdsは配列で指定してください' });
                    return;
                }
                yield mockPrisma.userChannel.deleteMany({ where: { user_id: userId } });
                yield mockPrisma.userChannel.createMany({
                    data: channelIds.map((channel_id) => ({ user_id: userId, channel_id }))
                });
                res.json({ message: 'ユーザーの放送局設定を更新しました' });
            }
            catch (err) {
                res.status(500).json({ message: 'Internal server error', error: err.message });
            }
        }));
    });
    describe('GET /api/channels', () => {
        it('認証なしで401エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .get('/api/channels')
                .expect(401);
        }));
        it('無効なトークンで403エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .get('/api/channels')
                .set('Authorization', 'Bearer invalid_token')
                .expect(403);
        }));
        it('正しいトークンで放送局一覧を取得できる', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            const mockChannels = [
                { id: 1, name: 'NHK', syobocal_cid: '1', area: '全国' },
                { id: 2, name: 'テレ東', syobocal_cid: '2', area: '関東' }
            ];
            mockPrisma.channel.findMany.mockResolvedValue(mockChannels);
            const res = yield (0, supertest_1.default)(app)
                .get('/api/channels')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            expect(res.body).toEqual(mockChannels);
            expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
                select: { id: true, name: true, syobocal_cid: true, area: true }
            });
        }));
    });
    describe('GET /api/user/channels', () => {
        it('認証なしで401エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .get('/api/user/channels')
                .expect(401);
        }));
        it('無効なトークンで403エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .get('/api/user/channels')
                .set('Authorization', 'Bearer invalid_token')
                .expect(403);
        }));
        it('正しいトークンでユーザー選択放送局一覧を取得できる', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            const mockUserChannels = [
                { channel: { id: 1, name: 'NHK', syobocal_cid: '1', area: '全国' } },
                { channel: { id: 2, name: 'テレ東', syobocal_cid: '2', area: '関東' } }
            ];
            mockPrisma.userChannel.findMany.mockResolvedValue(mockUserChannels);
            const res = yield (0, supertest_1.default)(app)
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
        }));
    });
    describe('POST /api/user/channels', () => {
        it('認証なしで401エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .post('/api/user/channels')
                .send({ channelIds: [1, 2] })
                .expect(401);
        }));
        it('無効なトークンで403エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .post('/api/user/channels')
                .set('Authorization', 'Bearer invalid_token')
                .send({ channelIds: [1, 2] })
                .expect(403);
        }));
        it('正しいトークンで選択放送局を保存できる', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            mockPrisma.userChannel.deleteMany.mockResolvedValue({});
            mockPrisma.userChannel.createMany.mockResolvedValue({});
            const res = yield (0, supertest_1.default)(app)
                .post('/api/user/channels')
                .set('Authorization', `Bearer ${token}`)
                .send({ channelIds: [1, 2] })
                .expect(200);
            expect(res.body).toEqual({ message: 'ユーザーの放送局設定を更新しました' });
            expect(mockPrisma.userChannel.deleteMany).toHaveBeenCalledWith({ where: { user_id: 1 } });
            expect(mockPrisma.userChannel.createMany).toHaveBeenCalledWith({
                data: [{ user_id: 1, channel_id: 1 }, { user_id: 1, channel_id: 2 }]
            });
        }));
        it('channelIdsが配列でない場合400エラー', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            const res = yield (0, supertest_1.default)(app)
                .post('/api/user/channels')
                .set('Authorization', `Bearer ${token}`)
                .send({ channelIds: 'not_array' })
                .expect(400);
            expect(res.body).toEqual({ message: 'channelIdsは配列で指定してください' });
        }));
    });
});
//# sourceMappingURL=channels.test.js.map