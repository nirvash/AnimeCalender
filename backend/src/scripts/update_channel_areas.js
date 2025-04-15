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
const areaUpdates = [
    // NHK
    { namePattern: 'NHK総合', area: '関東', exclude: ['大阪', '札幌', '名古屋', '福岡'] },
    { namePattern: 'NHK総合・東京', area: '関東' },
    { namePattern: 'NHK総合・大阪', area: '関西' },
    { namePattern: 'NHK総合・名古屋', area: '中部' },
    { namePattern: 'NHK総合・札幌', area: '北海道' },
    { namePattern: 'NHK総合・福岡', area: '九州' },
    { namePattern: 'NHK Eテレ', area: '関東', exclude: ['大阪', '札幌', '名古屋', '福岡'] },
    { namePattern: 'NHK教育', area: '関東', exclude: ['大阪', '札幌', '名古屋', '福岡'] },
    // 民放キー局
    { namePattern: '日本テレビ', area: '関東' },
    { namePattern: 'テレビ朝日', area: '関東' },
    { namePattern: 'TBS', area: '関東' },
    { namePattern: 'フジテレビ', area: '関東' },
    { namePattern: 'テレビ東京', area: '関東' },
    // 準キー局
    { namePattern: '読売テレビ', area: '関西' },
    { namePattern: '毎日放送', area: '関西' },
    { namePattern: '関西テレビ', area: '関西' },
    { namePattern: 'ABC', area: '関西' },
    { namePattern: 'テレビ大阪', area: '関西' },
    // 独立局
    { namePattern: 'TOKYO MX', area: '東京' },
    { namePattern: 'テレビ神奈川', area: '神奈川' },
    { namePattern: 'サンテレビ', area: '兵庫' },
    { namePattern: 'TVK', area: '神奈川' },
    { namePattern: 'チバテレビ', area: '千葉' },
    { namePattern: 'テレ玉', area: '埼玉' },
    // BS・CS
    { namePattern: 'NHK BS', area: 'BS' },
    { namePattern: 'BS日テレ', area: 'BS' },
    { namePattern: 'BS朝日', area: 'BS' },
    { namePattern: 'BS-TBS', area: 'BS' },
    { namePattern: 'BSフジ', area: 'BS' },
    { namePattern: 'BS11', area: 'BS' },
    { namePattern: 'BSテレ東', area: 'BS' },
    { namePattern: 'WOWOW', area: 'BS' },
    { namePattern: 'AT-X', area: 'CS' },
    { namePattern: 'アニマックス', area: 'CS' },
    { namePattern: 'キッズステーション', area: 'CS' }
];
function updateAreas() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('放送局のエリア情報更新を開始');
            let updatedCount = 0;
            for (const update of areaUpdates) {
                const channels = yield prisma.channel.findMany({
                    where: {
                        name: {
                            contains: update.namePattern
                        },
                        AND: update.exclude ? {
                            name: {
                                notIn: update.exclude.map(ex => `${update.namePattern}・${ex}`)
                            }
                        } : undefined
                    }
                });
                for (const channel of channels) {
                    yield prisma.channel.update({
                        where: { id: channel.id },
                        data: { area: update.area }
                    });
                    updatedCount++;
                }
            }
            console.log(`エリア情報を更新した放送局数: ${updatedCount}`);
            // 残りの未設定チャンネル数を表示
            const noAreaCount = yield prisma.channel.count({
                where: { area: null }
            });
            if (noAreaCount > 0) {
                console.log(`注意: エリア情報が未設定の放送局が ${noAreaCount} 件あります`);
            }
        }
        catch (error) {
            console.error('エリア情報の更新中にエラーが発生しました:', error);
            throw error;
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
updateAreas().catch(e => {
    console.error(e);
    process.exit(1);
});
