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
// Prismaの全テーブル内容を出力するスクリプト
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield prisma.user.findMany();
        const animes = yield prisma.anime.findMany();
        const channels = yield prisma.channel.findMany();
        const userAnimes = yield prisma.userAnime.findMany();
        const userChannels = yield prisma.userChannel.findMany();
        const episodes = yield prisma.episode.findMany();
        console.log('User:', users);
        console.log('Anime:', animes);
        console.log('Channel:', channels);
        console.log('UserAnime:', userAnimes);
        console.log('UserChannel:', userChannels);
        console.log('Episode:', episodes);
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
//# sourceMappingURL=showAllTables.js.map