import { fetchTimetableDataCore } from './TimetableCore';

describe('fetchTimetableDataCore', () => {
  it('正常にchannelIdsを返す', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { syobocal_cid: '123' },
          { syobocal_cid: '456' },
        ],
      });
    const dummyDate = new Date('2025-04-15T00:00:00+09:00');
    const result = await fetchTimetableDataCore({
      token: 'dummy',
      viewMode: 'day',
      currentBaseDate28h: dummyDate,
      fetchImpl: mockFetch,
    });
    expect(result.channelIds).toEqual(['123', '456']);
    expect(result.userChannels.length).toBe(2);
  });

  it('userChannelsがchannelプロパティを持つ場合も対応', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { channel: { syobocal_cid: '789' } },
        { channel: { syobocal_cid: '101' } },
      ],
    });
    const dummyDate = new Date('2025-04-15T00:00:00+09:00');
    const result = await fetchTimetableDataCore({
      token: 'dummy',
      viewMode: 'day',
      currentBaseDate28h: dummyDate,
      fetchImpl: mockFetch,
    });
    expect(result.channelIds).toEqual(['789', '101']);
  });

  it('fetch失敗時はエラーを投げる', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({ ok: false });
    const dummyDate = new Date('2025-04-15T00:00:00+09:00');
    await expect(
      fetchTimetableDataCore({
        token: 'dummy',
        viewMode: 'day',
        currentBaseDate28h: dummyDate,
        fetchImpl: mockFetch,
      })
    ).rejects.toThrow('放送局設定の取得に失敗しました');
  });
});
