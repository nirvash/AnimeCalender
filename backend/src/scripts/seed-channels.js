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
const channelData = [
    {
        name: 'NHK総合',
        syobocal_cid: '1',
        area: '関東',
    },
    {
        name: 'NHK教育',
        syobocal_cid: '2',
        area: '関東',
    },
    {
        name: '日本テレビ',
        syobocal_cid: '3',
        area: '関東',
    },
    {
        name: 'テレビ朝日',
        syobocal_cid: '4',
        area: '関東',
    },
    {
        name: 'TBS',
        syobocal_cid: '5',
        area: '関東',
    },
    {
        name: 'フジテレビ',
        syobocal_cid: '6',
        area: '関東',
    },
    {
        name: 'テレビ東京',
        syobocal_cid: '7',
        area: '関東',
    },
    {
        name: 'TOKYO MX',
        syobocal_cid: '19',
        area: '東京',
    },
    {
        name: 'BS11',
        syobocal_cid: '128',
        area: 'BS',
    },
    {
        name: 'AT-X',
        syobocal_cid: '333',
        area: 'CS',
    }
];
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('チャンネルデータのシード開始...');
        for (const channel of channelData) {
            const existingChannel = yield prisma.channel.findUnique({
                where: { syobocal_cid: channel.syobocal_cid }
            });
            if (!existingChannel) {
                yield prisma.channel.create({
                    data: channel
                });
                console.log(`チャンネルを作成: ${channel.name}`);
            }
            else {
                console.log(`チャンネルは既に存在: ${channel.name}`);
            }
        }
        console.log('チャンネルデータのシード完了');
    });
}
main()
    .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
//# sourceMappingURL=seed-channels.js.map