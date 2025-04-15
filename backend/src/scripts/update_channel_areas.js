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
exports.setPrismaClient = setPrismaClient;
exports.updateAreas = updateAreas;
const client_1 = require("@prisma/client");
let prisma = new client_1.PrismaClient();
// テスト用にPrismaClientを置き換えられるようにする
function setPrismaClient(client) {
    prisma = client;
}
const areaChannelMap_1 = require("../utils/areaChannelMap");
function updateAreas() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('放送局のエリア情報更新を開始');
            let updatedCount = 0;
            // syobocal_cid→エリアの逆引きマップを作成
            const cidToArea = new Map();
            for (const [area, cids] of Object.entries(areaChannelMap_1.areaChannelMap)) {
                for (const cid of cids) {
                    cidToArea.set(cid, area);
                }
            }
            // 全チャンネル取得し、マップに該当するものだけareaを更新
            const channels = yield prisma.channel.findMany({ select: { id: true, syobocal_cid: true } });
            for (const ch of channels) {
                const area = cidToArea.get(ch.syobocal_cid);
                if (area) {
                    if (!area) {
                        console.log(`no area for syobocal_cid: "${ch.syobocal_cid}"`);
                    }
                    else {
                        const result = yield prisma.channel.update({
                            where: { id: ch.id },
                            data: { area }
                        });
                        console.log(`updated id: ${ch.id}, syobocal_cid: "${ch.syobocal_cid}", area: ${area}, result.area: ${result.area}`);
                        updatedCount++;
                    }
                }
            }
            console.log(`エリア情報を更新した放送局数: ${updatedCount}`);
            // 残りの未設定チャンネル数を表示
            const noAreaCount = yield prisma.channel.count({
                where: { OR: [{ area: null }, { area: '' }] }
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
// スクリプトとして直接実行された場合のみ処理を開始
if (require.main === module) {
    updateAreas();
}
//# sourceMappingURL=update_channel_areas.js.map