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
// 視聴状態APIのテスト
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
describe('/api/watch-status', () => {
    let token;
    let episodeId;
    let animeId;
    let channelId;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // テスト用ユーザー作成
        yield prisma.user.deleteMany({ where: { email: 'test_watch_status@example.com' } });
        const res = yield (0, supertest_1.default)(index_1.default)
            .post('/api/auth/register')
            .send({ username: 'watchstatususer', email: 'test_watch_status@example.com', password: 'testpassword123' });
        token = res.body.token;
        // テスト用アニメ・エピソード作成
        const anime = yield prisma.anime.create({
            data: { title: 'テストアニメ', syobocal_tid: '999999' }
        });
        animeId = anime.id;
        const channel = yield prisma.channel.create({
            data: { name: 'テスト局', syobocal_cid: '9999', area: 'テストエリア' }
        });
        channelId = channel.id;
        const episode = yield prisma.episode.create({
            data: {
                anime_id: anime.id,
                channel_id: channel.id,
                st_time: new Date(),
                ed_time: new Date(Date.now() + 30 * 60 * 1000),
                sub_title: '第1話',
                pid: 99999999,
                last_update: new Date()
            }
        });
        episodeId = episode.id;
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // 削除順序: userAnime→episode→anime/channel→user
        yield prisma.userAnime.deleteMany({ where: { anime_id: animeId } });
        yield prisma.episode.deleteMany({ where: { id: episodeId } });
        yield prisma.anime.deleteMany({ where: { id: animeId } });
        yield prisma.channel.deleteMany({ where: { id: channelId } });
        yield prisma.user.deleteMany({ where: { email: 'test_watch_status@example.com' } });
        yield prisma.$disconnect();
    }));
    it('視聴中にできる', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.default)
            .post('/api/watch-status')
            .set('Authorization', `Bearer ${token}`)
            .send({ episodeId, watched: true });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // DB確認
        const userAnime = yield prisma.userAnime.findFirst({ where: { anime_id: animeId } });
        expect(userAnime === null || userAnime === void 0 ? void 0 : userAnime.status).toBe('WATCHING');
    }));
    it('未視聴に戻せる', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.default)
            .post('/api/watch-status')
            .set('Authorization', `Bearer ${token}`)
            .send({ episodeId, watched: false });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // DB確認
        const userAnime = yield prisma.userAnime.findFirst({ where: { anime_id: animeId } });
        expect(userAnime === null || userAnime === void 0 ? void 0 : userAnime.status).toBe('PLANNED');
    }));
    it('認証なしはエラー', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.default)
            .post('/api/watch-status')
            .send({ episodeId, watched: true });
        expect(res.status).toBe(401);
    }));
    it('パラメータ不足はエラー', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.default)
            .post('/api/watch-status')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(res.status).toBe(400);
    }));
});
//# sourceMappingURL=watch-status.test.js.map