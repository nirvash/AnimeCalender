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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
const app = (0, express_1.default)();
console.log("Initializing application...");
const httpsOptions = {
    key: fs_1.default.readFileSync('server.key'),
    cert: fs_1.default.readFileSync('server.crt'),
};
console.log("HTTPS options loaded.");
const PORT = parseInt(process.env.PORT || '3001', 10);
console.log(`PORT set to ${PORT}`);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
console.log("JWT secret initialized.");
// CORS設定をより明示的に指定
const allowedOrigin = 'https://bookish-space-capybara-pgr4p9qwvvf9xp5-5173.app.github.dev';
app.use((0, cors_1.default)()); // すべてのオリジンを許可
console.log("CORS enabled.");
app.use(body_parser_1.default.json());
console.log("Body parser enabled.");
// JWT認証ミドルウェア
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).send();
        return;
    }
    try {
        console.log('Verifying token:', token);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);
        // トークンのユーザーIDでDBのユーザー存在確認を追加
        const user = yield prisma.user.findUnique({
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
    }
    catch (err) {
        console.error('Token verification failed:', err);
        res.status(403).send();
    }
});
router.post('/api/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        // 入力バリデーション
        if (!username || !email || !password) {
            res.status(400).json({ message: 'username, email, passwordは必須です' });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ message: 'パスワードは8文字以上必要です' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ message: '有効なメールアドレスを入力してください' });
            return;
        }
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const existingUser = yield tx.user.findFirst({
                where: { OR: [{ email }, { username }] }
            });
            if (existingUser) {
                if (existingUser.email === email) {
                    res.status(409).json({ message: '既に登録済みのメールアドレスです' });
                    return null;
                }
                else {
                    res.status(409).json({ message: '既に使用されているユーザー名です' });
                    return null;
                }
            }
            const password_hash = yield bcryptjs_1.default.hash(password, 12);
            const user = yield tx.user.create({
                data: { username, email, password_hash }
            });
            const defaultChannels = yield tx.channel.findMany({
                where: { name: { in: ['TOKYO MX', 'BS11', 'AT-X'] } },
                select: { id: true }
            });
            if (defaultChannels.length > 0) {
                yield tx.userChannel.createMany({
                    data: defaultChannels.map(ch => ({
                        user_id: user.id,
                        channel_id: ch.id
                    }))
                });
            }
            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        }));
        if (!result) {
            res.status(500).json({ message: 'Internal server error: Transaction failed' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: result.id, username: result.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                id: result.id,
                username: result.username,
                email: result.email
            }
        });
        return;
    }
    catch (err) {
        console.error('Registration error:', err);
        if (err.message.includes('既に')) {
            res.status(409).json({ message: err.message });
            return;
        }
        else {
            res.status(500).json({
                message: 'アカウント登録に失敗しました',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
            return;
        }
    }
}));
router.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'email, passwordは必須です' });
            return;
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
            return;
        }
        const valid = yield bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}));
// 視聴リスト管理API
router.get('/api/watchlist/watching', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
router.get('/api/watchlist/unwatched', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
// テスト用の認証保護ルート
router.get('/api/auth/protected', authenticateToken, (req, res) => {
    res.json({ message: '認証済み', user: req.user });
});
// タイムテーブルデータ取得API
router.get('/api/timetable', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).send();
            return;
        }
        const { startDate, endDate, startDateTime, endDateTime, watchingOnly, channels } = req.query;
        console.log('Received channels parameter:', channels);
        // 日時優先、なければ従来の日付で対応
        let rangeStart = null;
        let rangeEnd = null;
        if (startDateTime && endDateTime) {
            // ISO文字列でそのまま解釈
            rangeStart = new Date(String(startDateTime));
            rangeEnd = new Date(String(endDateTime));
            if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
                res.status(400).json({ message: 'startDateTime/endDateTimeの形式が正しくありません (ISO 8601)' });
                return;
            }
        }
        else if (startDate && endDate) {
            // 従来通り「日付」→ JST 0:00～23:59:59
            const startDateStr = String(startDate);
            const endDateStr = String(endDate);
            rangeStart = new Date(`${startDateStr}T00:00:00+09:00`);
            rangeEnd = new Date(`${endDateStr}T23:59:59+09:00`);
            if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
                res.status(400).json({ message: 'startDate/endDateの形式が正しくありません (YYYY-MM-DD)' });
                return;
            }
        }
        else {
            res.status(400).json({ message: 'startDateTime/endDateTime もしくは startDate/endDate は必須です' });
            return;
        }
        let whereCondition = {
            st_time: {
                gte: rangeStart,
                lte: rangeEnd,
            }
        };
        // チャンネルフィルタの処理
        let channelIds = [];
        if (channels) {
            // URLパラメータから指定されたチャンネルID（syobocal_cid）を内部ID（id）に変換
            const syobocalCids = String(channels).split(',').map(id => id.trim());
            const specifiedChannels = yield prisma.channel.findMany({
                where: {
                    syobocal_cid: {
                        in: syobocalCids
                    }
                },
                select: { id: true, syobocal_cid: true }
            });
            // ログ出力で変換状況を確認
            console.log('syobocalCids:', syobocalCids);
            console.log('matched channel ids:', specifiedChannels.map(ch => ch.id));
            channelIds = specifiedChannels.map(ch => ch.id);
        }
        else {
            // ユーザーの選択した放送局を取得（従来の動作）
            const userChannels = yield prisma.userChannel.findMany({
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
            const watchingAnimes = yield prisma.userAnime.findMany({
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
        const episodes = yield prisma.episode.findMany({
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
    }
    catch (err) {
        console.error("Error fetching timetable:", err);
        console.error(err.stack);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}));
// 放送局一覧取得API
router.get('/api/channels', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const channels = yield prisma.channel.findMany({
            select: { id: true, name: true, syobocal_cid: true, area: true }
        });
        res.json(channels);
    }
    catch (err) {
        console.error('Error fetching channels:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}));
// ユーザーの選択済み放送局一覧取得API
router.get('/api/user/channels', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).send();
            return;
        }
        const userChannels = yield prisma.userChannel.findMany({
            where: { user_id: userId },
            include: { channel: { select: { id: true, name: true, syobocal_cid: true, area: true } } }
        });
        res.json(userChannels.map(uc => uc.channel));
    }
    catch (err) {
        console.error('Error fetching user channels:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}));
// 視聴状態更新API
router.post('/api/watch-status', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { episodeId, watched } = req.body;
        if (!userId || !episodeId) {
            res.status(400).json({ message: '必要なパラメータが不足しています' });
            return;
        }
        const episode = yield prisma.episode.findUnique({
            where: { id: episodeId },
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
// ユーザーの選択放送局保存API
router.post('/api/user/channels', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        const existingChannels = yield prisma.channel.findMany({
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
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.userChannel.deleteMany({
                where: { user_id: userId }
            });
            if (validChannelIds.length > 0) {
                yield tx.userChannel.createMany({
                    data: validChannelIds.map(channelId => ({
                        user_id: userId,
                        channel_id: channelId
                    }))
                });
            }
            return yield tx.userChannel.findMany({
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
        }));
        res.json({
            message: 'ユーザーの放送局設定を更新しました',
            channels: result
        });
    }
    catch (err) {
        console.error('Error in /api/user/channels:', err);
        res.status(500).json({
            message: 'Internal server error',
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    }
}));
console.log("Router middleware before applied.");
try {
    app.use(router);
    console.log("Router middleware applied.");
}
catch (error) {
    console.error("Error applying router middleware:", error);
}
console.log("Router middleware applied.");
console.log(`Using PORT: ${PORT}`);
console.log("Starting HTTPS server...");
https_1.default.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API server running securely on port ${PORT}`);
});
