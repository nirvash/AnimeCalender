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
const updater_1 = require("../../src/services/syobocal/updater");
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        channel: {
            upsert: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue(null)
        },
        anime: {
            upsert: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue(null)
        },
        episode: {
            upsert: jest.fn().mockResolvedValue({})
        }
    }))
}));
jest.mock('../../src/services/syobocal/client');
describe('SyobocalUpdater', () => {
    let updater;
    beforeEach(() => {
        jest.clearAllMocks();
        updater = new updater_1.SyobocalUpdater();
        updater.client = {
            getChannels: jest.fn().mockResolvedValue([]),
            getTitles: jest.fn().mockResolvedValue([]),
            getPrograms: jest.fn().mockResolvedValue([])
        };
        updater.prisma = {
            channel: {
                upsert: jest.fn().mockResolvedValue({}),
                findUnique: jest.fn().mockResolvedValue(null)
            },
            anime: {
                upsert: jest.fn().mockResolvedValue({}),
                findUnique: jest.fn().mockResolvedValue(null)
            },
            episode: {
                upsert: jest.fn().mockResolvedValue({})
            }
        };
    });
    describe('updateAnimes', () => {
        it('新規タイトルが正しく登録されること', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTitles = [{
                    TID: ['1000'],
                    Title: ['テストアニメ1'],
                    LastUpdate: ['20250413_000000']
                }];
            updater.client.getTitles.mockResolvedValue(mockTitles);
            yield updater.updateAnimes();
            expect(updater.prisma.anime.upsert).toHaveBeenCalledWith({
                where: { syobocal_tid: '1000' },
                create: {
                    syobocal_tid: '1000',
                    title: 'テストアニメ1'
                },
                update: {
                    title: 'テストアニメ1'
                }
            });
        }));
        it('既存タイトルが正しく更新されること', () => __awaiter(void 0, void 0, void 0, function* () {
            const existingTitle = {
                id: 2000,
                syobocal_tid: '2000',
                title: '更新前のタイトル'
            };
            const mockTitles = [{
                    TID: ['2000'],
                    Title: ['更新後のタイトル'],
                    LastUpdate: ['20250413_000000']
                }];
            updater.prisma.anime.findUnique.mockResolvedValue(existingTitle);
            updater.client.getTitles.mockResolvedValue(mockTitles);
            yield updater.updateAnimes();
            expect(updater.prisma.anime.upsert).toHaveBeenCalledWith({
                where: { syobocal_tid: '2000' },
                create: {
                    syobocal_tid: '2000',
                    title: '更新後のタイトル'
                },
                update: {
                    title: '更新後のタイトル'
                }
            });
        }));
        it('Prisma操作でエラーが発生した場合はエラーログが出力されること', () => __awaiter(void 0, void 0, void 0, function* () {
            // モックデータ
            const mockTitles = [{
                    TID: ['invalid'],
                    Title: ['テストアニメ'],
                    LastUpdate: ['20250413_000000']
                }];
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            updater.client.getTitles.mockResolvedValue(mockTitles);
            updater.prisma.anime.upsert = jest.fn()
                .mockRejectedValue(new Error('Invalid syobocal_tid format'));
            yield updater.updateAnimes();
            const calls = errorSpy.mock.calls;
            expect(calls.some(call => call[0].toString().includes('Failed to update anime') &&
                call[1] instanceof Error &&
                call[1].message.includes('Invalid syobocal_tid format'))).toBe(true);
            expect(updater.prisma.anime.upsert).toHaveBeenCalledWith({
                where: { syobocal_tid: 'invalid' },
                create: expect.any(Object),
                update: expect.any(Object)
            });
            errorSpy.mockReset();
            errorSpy.mockRestore();
        }));
        it('DBエラー時も処理を継続すること', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTitles = [
                {
                    TID: ['1000'],
                    Title: ['テストアニメ1'],
                    LastUpdate: ['20250413_000000']
                },
                {
                    TID: ['1001'],
                    Title: ['テストアニメ2'],
                    LastUpdate: ['20250413_000000']
                }
            ];
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            updater.client.getTitles.mockResolvedValue(mockTitles);
            // Prisma エラーをシミュレート
            class PrismaClientKnownRequestError extends Error {
                constructor() {
                    super('Unique constraint failed on the constraint: `syobocal_tid`');
                    this.name = 'PrismaClientKnownRequestError';
                    this.code = 'P2002';
                    this.meta = { target: ['syobocal_tid'] };
                }
            }
            updater.prisma.anime.upsert = jest.fn()
                .mockRejectedValueOnce(new PrismaClientKnownRequestError())
                .mockResolvedValueOnce({});
            // debugger; // DBエラー処理のブレークポイント
            yield updater.updateAnimes();
            // エラーメッセージが記録されていること
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to update anime'), expect.any(Error));
            // エラー後も2件目の処理が実行されていること
            expect(updater.prisma.anime.upsert).toHaveBeenCalledTimes(2);
            errorSpy.mockRestore();
        }));
    });
    describe('formatDate', () => {
        it('日付を正しい形式に変換すること', () => {
            const date = new Date(Date.UTC(2025, 3, 13));
            const result = updater.formatDate(date);
            expect(result).toBe('20250413_000000');
        });
    });
});
