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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function getDateRangeJST(baseDateStr) {
    // JSTでbaseDateの0:00～翌日4:00（28時制）
    const start = new Date(`${baseDateStr}T00:00:00+09:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    end.setHours(4, 0, 0, 0); // 翌4:00
    return { start, end };
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const baseDateStr = process.argv[2] || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const userId = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
        const { start, end } = getDateRangeJST(baseDateStr);
        let channelIds = undefined;
        if (userId) {
            const userChannels = yield prisma.userChannel.findMany({
                where: { user_id: userId },
                select: { channel_id: true }
            });
            channelIds = userChannels.map(uc => uc.channel_id);
            if (channelIds.length === 0) {
                console.log(`User ${userId} has no selected channels.`);
                return;
            }
        }
        const episodes = yield prisma.episode.findMany({
            where: Object.assign({ st_time: {
                    gte: start,
                    lt: end,
                } }, (channelIds ? { channel_id: { in: channelIds } } : {})),
            include: {
                anime: true,
                channel: true,
            },
            orderBy: { st_time: 'asc' },
        });
        console.log(`Episodes for ${baseDateStr} (28h制)${userId ? ` (user=${userId})` : ''}:`);
        episodes.forEach(ep => {
            var _a, _b, _c, _d, _e, _f;
            console.log(`[${ep.st_time.toISOString()}] ${(_b = (_a = ep.anime) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : ''} (${(_d = (_c = ep.channel) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : ''}) #${(_e = ep.count) !== null && _e !== void 0 ? _e : ''} ${(_f = ep.sub_title) !== null && _f !== void 0 ? _f : ''}`);
        });
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
