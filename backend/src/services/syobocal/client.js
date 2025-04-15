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
exports.SyobocalClient = void 0;
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
class SyobocalClient {
    constructor() {
        this.baseUrl = 'http://cal.syoboi.jp/db.php';
    }
    /**
     * 番組タイトル情報を取得
     */
    getTitles(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const params = {
                Command: 'TitleLookup',
            };
            if (tid) {
                params.TID = tid;
            }
            else {
                // 放送予定のある番組のIDを取得
                const start = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 14); // 2週間分の放送予定を取得
                const range = `${this.formatDate(start)}-${this.formatDate(end)}`;
                const programs = yield this.getPrograms(range);
                // 放送予定のある番組のTIDを抽出（重複を除去）
                const tids = [...new Set(programs.map((prog) => prog.TID[0]))];
                if (tids.length > 0) {
                    params.TID = tids.join(',');
                }
            }
            const response = yield this.request(params);
            return ((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.TitleLookupResponse) === null || _a === void 0 ? void 0 : _a.TitleItems) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.TitleItem) || [];
        });
    }
    /**
     * 放送予定・エピソード情報を取得
     */
    getPrograms(range) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const params = {
                Command: 'ProgLookup',
                Range: range,
            };
            const response = yield this.request(params);
            // ProgItemsが存在しない、または空の場合は空配列を返す
            return ((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.ProgLookupResponse) === null || _a === void 0 ? void 0 : _a.ProgItems) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.ProgItem) || [];
        });
    }
    /**
     * 放送局情報を取得
     */
    getChannels() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const params = {
                Command: 'ChLookup',
            };
            const response = yield this.request(params);
            // ChItemsが存在しない、または空の場合は空配列を返す
            return ((_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.ChLookupResponse) === null || _a === void 0 ? void 0 : _a.ChItems) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.ChItem) || [];
        });
    }
    /**
     * 日付をYYYYMMDD_HHMMSS形式に変換
     */
    formatDate(date) {
        return date.toISOString()
            .slice(0, 19) // YYYY-MM-DDTHH:mm:ss
            .replace(/[-:T]/g, '') // YYYYMMDDHHmmss
            .replace(/(\d{8})(\d{6})/, '$1_$2'); // YYYYMMDD_HHMMSS
    }
    /**
     * APIリクエストを実行しXMLをパース
     */
    request(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🌐 Requesting Syobocal API:', {
                    url: this.baseUrl,
                    params: params
                });
                const response = yield axios_1.default.get(this.baseUrl, { params });
                const result = yield (0, xml2js_1.parseStringPromise)(response.data);
                this.checkApiError(result);
                return result;
            }
            catch (error) {
                console.error('Syobocal API error:', error);
                throw error;
            }
        });
    }
    /**
     * APIのエラーレスポンスをチェック
     */
    checkApiError(result) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const code = ((_d = (_c = (_b = (_a = result === null || result === void 0 ? void 0 : result.TitleLookupResponse) === null || _a === void 0 ? void 0 : _a.Result) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.Code) === null || _d === void 0 ? void 0 : _d[0]) ||
            ((_h = (_g = (_f = (_e = result === null || result === void 0 ? void 0 : result.ProgLookupResponse) === null || _e === void 0 ? void 0 : _e.Result) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.Code) === null || _h === void 0 ? void 0 : _h[0]) ||
            ((_m = (_l = (_k = (_j = result === null || result === void 0 ? void 0 : result.ChLookupResponse) === null || _j === void 0 ? void 0 : _j.Result) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.Code) === null || _m === void 0 ? void 0 : _m[0]);
        const message = ((_r = (_q = (_p = (_o = result === null || result === void 0 ? void 0 : result.TitleLookupResponse) === null || _o === void 0 ? void 0 : _o.Result) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.Message) === null || _r === void 0 ? void 0 : _r[0]) ||
            ((_v = (_u = (_t = (_s = result === null || result === void 0 ? void 0 : result.ProgLookupResponse) === null || _s === void 0 ? void 0 : _s.Result) === null || _t === void 0 ? void 0 : _t[0]) === null || _u === void 0 ? void 0 : _u.Message) === null || _v === void 0 ? void 0 : _v[0]) ||
            ((_z = (_y = (_x = (_w = result === null || result === void 0 ? void 0 : result.ChLookupResponse) === null || _w === void 0 ? void 0 : _w.Result) === null || _x === void 0 ? void 0 : _x[0]) === null || _y === void 0 ? void 0 : _y.Message) === null || _z === void 0 ? void 0 : _z[0]) ||
            'Unknown error';
        if (code !== '200') {
            throw new Error(`API returned error (${code}): ${message}`);
        }
    }
}
exports.SyobocalClient = SyobocalClient;
