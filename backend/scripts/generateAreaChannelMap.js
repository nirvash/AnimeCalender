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
// DBからチャンネル情報を取得し、エリアごとにsyobocal_cidを分類したマップを生成するスクリプト
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const channels = yield prisma.channel.findMany({
            select: { syobocal_cid: true, area: true }
        });
        const areaMap = {};
        for (const ch of channels) {
            if (!ch.area || !ch.syobocal_cid)
                continue;
            if (!areaMap[ch.area])
                areaMap[ch.area] = [];
            areaMap[ch.area].push(ch.syobocal_cid);
        }
        const fileContent = '// エリアごとにチャンネルsyobocal_cidを分類するマップ（自動生成）\n' +
            'export const areaChannelMap: Record<string, string[]> = ' +
            JSON.stringify(areaMap, null, 2) +
            ';\n';
        const outPath = path_1.default.resolve(__dirname, '../src/utils/areaChannelMap.ts');
        (0, fs_1.writeFileSync)(outPath, fileContent, { encoding: 'utf8' });
        console.log('areaChannelMap.ts を生成しました');
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
//# sourceMappingURL=generateAreaChannelMap.js.map