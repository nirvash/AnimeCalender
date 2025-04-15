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
exports.SyobocalUpdater = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("./client");
class SyobocalUpdater {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.client = new client_2.SyobocalClient();
    }
    /**
     * 全データの更新を実行
     */
    updateAll() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('データ更新開始');
            try {
                // 1. チャンネル情報の更新
                yield this.updateChannels();
                // 2. アニメ情報の更新
                yield this.updateAnimes();
                // 3. 番組情報の更新
                yield this.updatePrograms();
                console.log('データ更新完了');
            }
            catch (error) {
                console.error('データ更新エラー:', error);
                throw error;
            }
        });
    }
    /**
     * チャンネル情報を更新
     */
    updateChannels() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('チャンネル情報の更新開始');
            const channels = yield this.client.getChannels();
            for (const ch of channels) {
                const id = parseInt(ch.ChID[0]);
                try {
                    yield this.prisma.channel.upsert({
                        where: { id },
                        create: {
                            id,
                            syobocal_cid: ch.ChID[0],
                            name: ch.ChName[0],
                            epg_name: ch.ChiEPGName[0] || null,
                            url: ch.ChURL[0] || null,
                            epg_url: ch.ChEPGURL[0] || null,
                            comment: ch.ChComment[0] || null,
                            gid: ch.ChGID[0] ? parseInt(ch.ChGID[0]) : null,
                            number: ch.ChNumber[0] ? parseInt(ch.ChNumber[0]) : null,
                            last_update: new Date(ch.LastUpdate[0].replace(/_/g, ' '))
                        },
                        update: {
                            name: ch.ChName[0],
                            epg_name: ch.ChiEPGName[0] || null,
                            url: ch.ChURL[0] || null,
                            epg_url: ch.ChEPGURL[0] || null,
                            comment: ch.ChComment[0] || null,
                            gid: ch.ChGID[0] ? parseInt(ch.ChGID[0]) : null,
                            number: ch.ChNumber[0] ? parseInt(ch.ChNumber[0]) : null,
                            last_update: new Date(ch.LastUpdate[0].replace(/_/g, ' '))
                        }
                    });
                }
                catch (error) {
                    console.error(`Failed to update channel ${id}:`, error);
                }
            }
            console.log('チャンネル情報の更新完了');
        });
    }
    /**
     * アニメ情報を更新
     */
    updateAnimes() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('アニメ情報の更新開始');
            const titles = yield this.client.getTitles();
            console.log(`📝 取得したタイトル数: ${titles.length}`);
            for (const title of titles) {
                try {
                    console.log('📝 Processing title:', {
                        tid: title.TID[0],
                        title: title.Title[0]
                    });
                    yield this.prisma.anime.upsert({
                        where: { syobocal_tid: title.TID[0] },
                        create: {
                            syobocal_tid: title.TID[0],
                            title: title.Title[0]
                        },
                        update: {
                            title: title.Title[0]
                        }
                    });
                }
                catch (error) {
                    console.error(`Failed to update anime ${title.TID[0]}:`, error);
                }
            }
            console.log('アニメ情報の更新完了');
        });
    }
    /**
     * 番組情報を更新
     */
    updatePrograms() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('番組情報の更新開始');
            // 1週間分の日付範囲を作成
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 7);
            const dateRange = `${this.formatDate(startDate)}-${this.formatDate(endDate)}`;
            // 番組データを取得
            const programs = yield this.client.getPrograms(dateRange);
            console.log(`📝 取得した番組数: ${programs.length}`);
            // 番組データに含まれるアニメIDを抽出
            const tids = [...new Set(programs.map(prog => prog.TID[0]))];
            console.log(`📝 関連するアニメ数: ${tids.length}`);
            // アニメ情報を取得（番組に関連するアニメのみ）
            const tidsParam = tids.join(',');
            const titles = yield this.client.getTitles(tidsParam);
            console.log(`📝 取得したタイトル数: ${titles.length}`);
            // アニメ情報を更新 & 成功したIDを記録
            const registeredAnimeIds = new Map();
            for (const title of titles) {
                try {
                    // 既存レコードがあればidを取得、なければ新規作成
                    const upserted = yield this.prisma.anime.upsert({
                        where: { syobocal_tid: title.TID[0] },
                        create: {
                            syobocal_tid: title.TID[0],
                            title: title.Title[0]
                        },
                        update: {
                            title: title.Title[0]
                        }
                    });
                    registeredAnimeIds.set(title.TID[0], upserted.id);
                }
                catch (error) {
                    console.error(`Failed to update anime ${title.TID[0]}:`, error);
                }
            }
            // 番組情報を更新
            for (const prog of programs) {
                if (prog.Deleted[0] === '1') {
                    console.log(`⏭️ Skipping deleted program: ${prog.PID[0]}`);
                    continue;
                }
                const pid = parseInt(prog.PID[0]);
                const animeId = parseInt(prog.TID[0]);
                const syobocalCid = prog.ChID[0];
                let channelId = null;
                try {
                    // アニメが登録済みか確認
                    const animeIdFromMap = registeredAnimeIds.get(prog.TID[0]);
                    if (!animeIdFromMap) {
                        console.warn(`⚠️ Skipping program ${pid}: anime ${prog.TID[0]} was not registered successfully`);
                        continue;
                    }
                    // チャンネルの存在確認（syobocal_cidで検索）
                    const channel = yield this.prisma.channel.findUnique({ where: { syobocal_cid: syobocalCid } });
                    if (!channel) {
                        console.warn(`⚠️ Skipping program ${pid} due to missing channel:`, {
                            anime_id: animeId,
                            channel_syobocal_cid: syobocalCid
                        });
                        continue;
                    }
                    channelId = channel.id;
                    // エピソード情報を更新
                    yield this.prisma.episode.upsert({
                        where: { pid },
                        create: {
                            pid,
                            anime: { connect: { id: animeIdFromMap } },
                            channel: { connect: { id: channelId } },
                            st_time: new Date(prog.StTime[0].replace(/_/g, ' ')),
                            ed_time: new Date(prog.EdTime[0].replace(/_/g, ' ')),
                            count: prog.Count[0] ? parseInt(prog.Count[0]) : null,
                            sub_title: prog.SubTitle[0] || null,
                            prog_comment: prog.ProgComment[0] || null,
                            flag: prog.Flag[0] ? parseInt(prog.Flag[0]) : null,
                            deleted: false,
                            warn: prog.Warn[0] ? parseInt(prog.Warn[0]) : null,
                            revision: prog.Revision[0] ? parseInt(prog.Revision[0]) : null,
                            last_update: new Date(prog.LastUpdate[0].replace(/_/g, ' '))
                        },
                        update: {
                            anime: { connect: { id: animeIdFromMap } },
                            channel: { connect: { id: channelId } },
                            st_time: new Date(prog.StTime[0].replace(/_/g, ' ')),
                            ed_time: new Date(prog.EdTime[0].replace(/_/g, ' ')),
                            count: prog.Count[0] ? parseInt(prog.Count[0]) : null,
                            sub_title: prog.SubTitle[0] || null,
                            prog_comment: prog.ProgComment[0] || null,
                            flag: prog.Flag[0] ? parseInt(prog.Flag[0]) : null,
                            warn: prog.Warn[0] ? parseInt(prog.Warn[0]) : null,
                            revision: prog.Revision[0] ? parseInt(prog.Revision[0]) : null,
                            last_update: new Date(prog.LastUpdate[0].replace(/_/g, ' '))
                        }
                    });
                }
                catch (error) {
                    console.warn(`⚠️ Failed to update program ${pid}:`, error);
                }
            }
            console.log('番組情報の更新完了');
        });
    }
    /**
     * 日付をYYYYMMDD_HHMMSS形式に変換
     */
    formatDate(date) {
        return date.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d+/, '')
            .replace('T', '_')
            .replace('Z', ''); // タイムゾーン指示子を削除
    }
}
exports.SyobocalUpdater = SyobocalUpdater;
