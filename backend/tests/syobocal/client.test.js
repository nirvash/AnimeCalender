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
const client_1 = require("../../src/services/syobocal/client");
const axios_1 = __importDefault(require("axios"));
// axiosをモック化
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('SyobocalClient', () => {
    let client;
    beforeEach(() => {
        client = new client_1.SyobocalClient();
        jest.clearAllMocks();
    });
    describe('getTitles', () => {
        it('タイトル情報を取得できること', () => __awaiter(void 0, void 0, void 0, function* () {
            // getPrograms用のモックレスポンス
            const mockProgResponse = {
                data: `
          <?xml version="1.0" encoding="UTF-8"?>
          <ProgLookupResponse>
            <ProgItems>
              <ProgItem id="1">
                <TID>7328</TID>
              </ProgItem>
            </ProgItems>
            <Result>
              <Code>200</Code>
              <Message></Message>
            </Result>
          </ProgLookupResponse>
        `
            };
            // TitleLookupResponse用のモックレスポンス
            const mockTitleResponse = {
                data: `
          <?xml version="1.0" encoding="UTF-8"?>
          <TitleLookupResponse>
            <Result>
              <Code>200</Code>
              <Message></Message>
            </Result>
            <TitleItems>
              <TitleItem id="7328">
                <TID>7328</TID>
                <LastUpdate>2025-04-13 02:46:35</LastUpdate>
                <Title>テストアニメ</Title>
                <ShortTitle></ShortTitle>
                <TitleYomi>てすとあにめ</TitleYomi>
                <TitleEN></TitleEN>
                <Comment></Comment>
                <Cat>1</Cat>
                <TitleFlag>0</TitleFlag>
                <FirstYear>2025</FirstYear>
                <FirstMonth>1</FirstMonth>
              </TitleItem>
            </TitleItems>
          </TitleLookupResponse>
        `
            };
            mockedAxios.get.mockResolvedValueOnce(mockProgResponse); // getPrograms用
            mockedAxios.get.mockResolvedValueOnce(mockTitleResponse); // getTitles用
            const result = yield client.getTitles();
            expect(mockedAxios.get).toHaveBeenCalledWith('http://cal.syoboi.jp/db.php', expect.objectContaining({
                params: expect.objectContaining({ Command: 'ProgLookup' })
            }));
            expect(mockedAxios.get).toHaveBeenCalledWith('http://cal.syoboi.jp/db.php', expect.objectContaining({
                params: expect.objectContaining({ Command: 'TitleLookup', TID: '7328' })
            }));
            expect(result).toEqual([{
                    $: { id: '7328' },
                    TID: ['7328'],
                    LastUpdate: ['2025-04-13 02:46:35'],
                    Title: ['テストアニメ'],
                    ShortTitle: [''],
                    TitleYomi: ['てすとあにめ'],
                    TitleEN: [''],
                    Comment: [''],
                    Cat: ['1'],
                    TitleFlag: ['0'],
                    FirstYear: ['2025'],
                    FirstMonth: ['1']
                }]);
        }));
    });
    describe('getPrograms', () => {
        it('番組情報を取得できること', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockResponse = {
                data: `
          <?xml version="1.0" encoding="UTF-8"?>
          <ProgLookupResponse>
            <ProgItems>
              <ProgItem id="662213">
                <LastUpdate>20250315_043256</LastUpdate>
                <PID>662213</PID>
                <TID>7328</TID>
                <StTime>20250413_000000</StTime>
                <StOffset>0</StOffset>
                <EdTime>20250413_003000</EdTime>
                <Count>1</Count>
                <SubTitle>テストエピソード</SubTitle>
                <ProgComment></ProgComment>
                <Flag>0</Flag>
                <Deleted>0</Deleted>
                <Warn>0</Warn>
                <ChID>1</ChID>
                <Revision>0</Revision>
              </ProgItem>
            </ProgItems>
            <Result>
              <Code>200</Code>
              <Message></Message>
            </Result>
          </ProgLookupResponse>
        `
            };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);
            const result = yield client.getPrograms('20250413_000000-20250414_235959');
            expect(mockedAxios.get).toHaveBeenCalledWith('http://cal.syoboi.jp/db.php', expect.objectContaining({
                params: {
                    Command: 'ProgLookup',
                    Range: '20250413_000000-20250414_235959'
                }
            }));
            expect(result).toEqual([{
                    $: { id: '662213' },
                    LastUpdate: ['20250315_043256'],
                    PID: ['662213'],
                    TID: ['7328'],
                    StTime: ['20250413_000000'],
                    StOffset: ['0'],
                    EdTime: ['20250413_003000'],
                    Count: ['1'],
                    SubTitle: ['テストエピソード'],
                    ProgComment: [''],
                    Flag: ['0'],
                    Deleted: ['0'],
                    Warn: ['0'],
                    ChID: ['1'],
                    Revision: ['0']
                }]);
        }));
    });
    describe('getChannels', () => {
        it('チャンネル情報を取得できること', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockResponse = {
                data: `
          <?xml version="1.0" encoding="UTF-8"?>
          <ChLookupResponse>
            <Result>
              <Code>200</Code>
              <Message></Message>
            </Result>
            <ChItems>
              <ChItem id="1">
                <LastUpdate>20201011_055816</LastUpdate>
                <ChID>1</ChID>
                <ChName>テストチャンネル</ChName>
                <ChiEPGName>テストＣＨ</ChiEPGName>
                <ChURL>https://example.com/</ChURL>
                <ChEPGURL>https://example.com/timetable/</ChEPGURL>
                <ChComment></ChComment>
                <ChGID>1</ChGID>
                <ChNumber>1</ChNumber>
              </ChItem>
            </ChItems>
          </ChLookupResponse>
        `
            };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);
            const result = yield client.getChannels();
            expect(mockedAxios.get).toHaveBeenCalledWith('http://cal.syoboi.jp/db.php', expect.objectContaining({
                params: {
                    Command: 'ChLookup'
                }
            }));
            expect(result).toEqual([{
                    $: { id: '1' },
                    LastUpdate: ['20201011_055816'],
                    ChID: ['1'],
                    ChName: ['テストチャンネル'],
                    ChiEPGName: ['テストＣＨ'],
                    ChURL: ['https://example.com/'],
                    ChEPGURL: ['https://example.com/timetable/'],
                    ChComment: [''],
                    ChGID: ['1'],
                    ChNumber: ['1']
                }]);
        }));
    });
});
//# sourceMappingURL=client.test.js.map