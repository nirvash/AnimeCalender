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
// areaChannelMapで分類されていないチャンネルを列挙するスクリプト
const client_1 = require("@prisma/client");
const areaChannelMap_1 = require("../src/utils/areaChannelMap");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // マップに含まれる全syobocal_cid
        const classified = new Set();
        Object.values(areaChannelMap_1.areaChannelMap).forEach(arr => arr.forEach(cid => classified.add(cid)));
        const channels = yield prisma.channel.findMany({
            select: { syobocal_cid: true, name: true }
        });
        const unclassified = channels.filter(ch => !classified.has(ch.syobocal_cid));
        if (unclassified.length === 0) {
            console.log('未分類のチャンネルはありません。');
            return;
        }
        console.log('未分類チャンネル一覧:');
        for (const ch of unclassified) {
            console.log(`syobocal_cid: ${ch.syobocal_cid}, name: ${ch.name}`);
        }
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
//# sourceMappingURL=listUnclassifiedChannels.js.map