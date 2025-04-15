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
const globals_1 = require("@jest/globals");
const update_channel_areas_1 = require("../src/scripts/update_channel_areas");
describe('updateAreas', () => {
    // テスト用のモックPrismaClientを作成
    const mockChannel = {
        findMany: globals_1.jest.fn().mockImplementation(() => Promise.resolve([])),
        update: globals_1.jest.fn().mockImplementation(() => Promise.resolve({})),
        count: globals_1.jest.fn().mockImplementation(() => Promise.resolve(0)),
    };
    const mockPrismaClient = {
        channel: mockChannel,
        $disconnect: globals_1.jest.fn(),
    };
    beforeAll(() => {
        globals_1.jest.clearAllMocks();
        (0, update_channel_areas_1.setPrismaClient)(mockPrismaClient);
    });
    it('チャンネルのエリア情報を更新できること', () => __awaiter(void 0, void 0, void 0, function* () {
        // NHK総合のテストケース
        const testChannels = [
            {
                id: 1,
                name: 'NHK総合',
                number: 1,
                syobocal_cid: '1',
                epg_name: null,
                url: null,
                epg_url: null,
                comment: null,
                gid: null,
                last_update: null,
                area: null
            }
        ];
        mockChannel.findMany.mockImplementation(() => Promise.resolve(testChannels));
        mockChannel.update.mockImplementation(() => Promise.resolve(testChannels[0]));
        mockChannel.count.mockImplementation(() => Promise.resolve(5));
        yield (0, update_channel_areas_1.updateAreas)();
        // チャンネル検索が適切に呼び出されたことを確認
        expect(mockPrismaClient.channel.findMany).toHaveBeenCalled();
        // 更新が正しく呼ばれ、適切なデータで更新されていることを確認
        expect(mockPrismaClient.channel.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { area: '関東' }
        });
        // 未設定チャンネルの確認が行われたことを確認
        expect(mockPrismaClient.channel.count).toHaveBeenCalledWith({
            where: { area: null }
        });
    }));
    it('エラー時に適切に処理されること', () => __awaiter(void 0, void 0, void 0, function* () {
        const testError = new Error('テストエラー');
        mockChannel.findMany.mockImplementation(() => Promise.reject(testError));
        console.error = globals_1.jest.fn();
        yield expect((0, update_channel_areas_1.updateAreas)()).rejects.toThrow('テストエラー');
        expect(console.error).toHaveBeenCalledWith('エリア情報の更新中にエラーが発生しました:', testError);
    }));
    it('データベース接続が正しく切断されること', () => __awaiter(void 0, void 0, void 0, function* () {
        mockChannel.findMany.mockImplementation(() => Promise.resolve([]));
        mockChannel.count.mockImplementation(() => Promise.resolve(0));
        yield (0, update_channel_areas_1.updateAreas)();
        expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    }));
});
