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
const client_2 = require("../services/syobocal/client");
const prisma = new client_1.PrismaClient();
const client = new client_2.SyobocalClient();
function updateChannels() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('放送局情報の更新を開始');
            // しょぼいカレンダーAPIから放送局情報を取得
            const channels = yield client.getChannels();
            console.log(`取得した放送局数: ${channels.length}`);
            // 新規・更新データを準備
            const channelData = channels.map((ch) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return ({
                    where: { syobocal_cid: ch.ChID[0] },
                    create: {
                        syobocal_cid: ch.ChID[0],
                        name: ch.ChName[0],
                        epg_name: ((_a = ch.ChiEPGName) === null || _a === void 0 ? void 0 : _a[0]) || null,
                        url: ((_b = ch.ChURL) === null || _b === void 0 ? void 0 : _b[0]) || null,
                        epg_url: ((_c = ch.ChEPGURL) === null || _c === void 0 ? void 0 : _c[0]) || null,
                        area: null,
                        comment: ((_d = ch.ChComment) === null || _d === void 0 ? void 0 : _d[0]) || null,
                        gid: ((_e = ch.ChGID) === null || _e === void 0 ? void 0 : _e[0]) ? parseInt(ch.ChGID[0]) : null,
                        number: ((_f = ch.ChNumber) === null || _f === void 0 ? void 0 : _f[0]) ? parseInt(ch.ChNumber[0]) : null,
                        last_update: ((_g = ch.LastUpdate) === null || _g === void 0 ? void 0 : _g[0]) ? new Date(ch.LastUpdate[0].replace(/_/g, ' ')) : null
                    },
                    update: {
                        name: ch.ChName[0],
                        epg_name: ((_h = ch.ChiEPGName) === null || _h === void 0 ? void 0 : _h[0]) || null,
                        url: ((_j = ch.ChURL) === null || _j === void 0 ? void 0 : _j[0]) || null,
                        epg_url: ((_k = ch.ChEPGURL) === null || _k === void 0 ? void 0 : _k[0]) || null,
                        comment: ((_l = ch.ChComment) === null || _l === void 0 ? void 0 : _l[0]) || null,
                        gid: ((_m = ch.ChGID) === null || _m === void 0 ? void 0 : _m[0]) ? parseInt(ch.ChGID[0]) : null,
                        number: ((_o = ch.ChNumber) === null || _o === void 0 ? void 0 : _o[0]) ? parseInt(ch.ChNumber[0]) : null,
                        last_update: ((_p = ch.LastUpdate) === null || _p === void 0 ? void 0 : _p[0]) ? new Date(ch.LastUpdate[0].replace(/_/g, ' ')) : null
                    }
                });
            });
            // 順次upsert実行
            console.log('放送局データの更新を開始');
            for (const data of channelData) {
                yield prisma.channel.upsert(data);
            }
            const updatedCount = yield prisma.channel.count({
                where: {
                    syobocal_cid: {
                        in: channels.map((ch) => ch.ChID[0])
                    }
                }
            });
            console.log('放送局データの更新が完了しました');
            console.log(`更新された放送局数: ${updatedCount} / ${channels.length}`);
            // エリア情報が未設定のチャンネル数を表示
            const noAreaCount = yield prisma.channel.count({
                where: { area: null }
            });
            if (noAreaCount > 0) {
                console.log(`注意: エリア情報が未設定の放送局が ${noAreaCount} 件あります`);
            }
        }
        catch (error) {
            console.error('放送局情報の更新中にエラーが発生しました:', error);
            throw error;
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
// スクリプト実行
updateChannels().catch(e => {
    console.error(e);
    process.exit(1);
});
