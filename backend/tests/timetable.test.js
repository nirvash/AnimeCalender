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
    let app;
    let mockPrisma;
    beforeEach(() => {
        // モックのリセット
        jest.clearAllMocks();
        // テスト用のExpressアプリケーションを作成
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((0, cors_1.default)());
        // PrismaClientのモックを取得
        mockPrisma = new client_1.PrismaClient();
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
        // タイムテーブルエンドポイントをセットアップ
        app.get('/api/timetable', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // 日付パラメータのバリデーション
                if (!req.query.startDate || !req.query.endDate) {
                    return res.status(400).json({ message: '開始日と終了日は必須です' });
                }
                const { startDate, endDate, watchingOnly } = req.query;
                const userId = req.user.userId;
                let whereCondition = {
                    st_time: {
                        gte: new Date(`${startDate}T00:00:00Z`),
                        lte: new Date(`${endDate}T23:59:59Z`),
                    },
                };
                if (watchingOnly === 'true') {
                    const watchingAnimes = yield mockPrisma.userAnime.findMany({
                        where: {
                            user_id: userId,
                            status: 'watching',
                        },
                        select: {
                            anime_id: true,
                        },
                    });
                    const watchingAnimeIds = watchingAnimes.map((ua) => ua.anime_id);
                    whereCondition.anime_id = {
                        in: watchingAnimeIds,
                    };
                }
                const episodes = yield mockPrisma.episode.findMany({
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
            }
            catch (error) {
                res.status(500).json({ message: 'Internal server error' });
            }
        }));
    });
    describe('GET /api/timetable', () => {
        it('認証なしでアクセスすると401エラーを返すこと', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .get('/api/timetable')
                .expect(401);
        }));
        it('無効なトークンで403エラーを返すこと', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(app)
                .get('/api/timetable')
                .set('Authorization', 'Bearer invalid_token')
                .expect(403);
        }));
        it('正しいトークンで番組データを取得できること', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            const response = yield (0, supertest_1.default)(app)
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
        }));
        it('視聴中のみフィルタが機能すること', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            yield (0, supertest_1.default)(app)
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
        }));
        it('日付範囲が必須であること', () => __awaiter(void 0, void 0, void 0, function* () {
            const token = jsonwebtoken_1.default.sign({ userId: 1, username: 'testuser' }, JWT_SECRET);
            const response = yield (0, supertest_1.default)(app)
                .get('/api/timetable')
                .set('Authorization', `Bearer ${token}`)
                .expect(400);
            expect(response.body).toEqual({
                message: '開始日と終了日は必須です'
            });
            // 開始日のみ指定した場合も400
            yield (0, supertest_1.default)(app)
                .get('/api/timetable')
                .set('Authorization', `Bearer ${token}`)
                .query({ startDate: '2025-04-13' })
                .expect(400);
            // 終了日のみ指定した場合も400
            yield (0, supertest_1.default)(app)
                .get('/api/timetable')
                .set('Authorization', `Bearer ${token}`)
                .expect(400);
        }));
    });
});
//# sourceMappingURL=timetable.test.js.map