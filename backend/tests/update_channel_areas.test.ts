import { Channel, PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';
import { updateAreas, setPrismaClient } from '../src/scripts/update_channel_areas';

describe('updateAreas', () => {
  // テスト用のモックPrismaClientを作成
  const mockChannel = {
    findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    update: jest.fn().mockImplementation(() => Promise.resolve({})),
    count: jest.fn().mockImplementation(() => Promise.resolve(0)),
  };

  const mockPrismaClient = {
    channel: mockChannel,
    $disconnect: jest.fn(),
  } as unknown as PrismaClient;

  beforeAll(() => {
    jest.clearAllMocks();
    setPrismaClient(mockPrismaClient);
  });

  it('チャンネルのエリア情報を更新できること', async () => {
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

    await updateAreas();

    // チャンネル検索が適切に呼び出されたことを確認
    expect(mockPrismaClient.channel.findMany).toHaveBeenCalled();
    
    // 更新が正しく呼ばれ、適切なデータで更新されていることを確認
    expect(mockPrismaClient.channel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { area: '関東' }
    });

    // 未設定チャンネルの確認が行われたことを確認
    expect(mockPrismaClient.channel.count).toHaveBeenCalledWith({
      where: { OR: [{ area: null }, { area: '' }] }
    });
  });

  it('エラー時に適切に処理されること', async () => {
    const testError = new Error('テストエラー');
    mockChannel.findMany.mockImplementation(() => Promise.reject(testError));
    console.error = jest.fn();

    await expect(updateAreas()).rejects.toThrow('テストエラー');
    expect(console.error).toHaveBeenCalledWith(
      'エリア情報の更新中にエラーが発生しました:',
      testError
    );
  });

  it('データベース接続が正しく切断されること', async () => {
    mockChannel.findMany.mockImplementation(() => Promise.resolve([]));
    mockChannel.count.mockImplementation(() => Promise.resolve(0));

    await updateAreas();

    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
  });
});