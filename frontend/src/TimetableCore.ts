// TimetableCore.ts
// fetchTimetableDataのロジック部分をテスト可能に切り出し
import { calculateDateRange28h } from './timetableDateUtils';

export interface FetchTimetableDataCoreArgs {
  token: string;
  viewMode: 'day' | '3days' | 'week';
  currentBaseDate28h: Date;
  fetchImpl?: typeof fetch;
}

export interface FetchTimetableDataCoreResult {
  channelIds: string[];
  userChannels: any[];
}

export async function fetchTimetableDataCore({
  token,
  viewMode,
  currentBaseDate28h,
  fetchImpl = fetch,
}: FetchTimetableDataCoreArgs): Promise<FetchTimetableDataCoreResult> {
  const { startDate, endDate } = calculateDateRange28h(viewMode, currentBaseDate28h);

  const userChannelsResponse = await fetchImpl('/api/user/channels', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!userChannelsResponse.ok) throw new Error('放送局設定の取得に失敗しました');
  const userChannels = await userChannelsResponse.json();
  const channelIds = userChannels.map((uc: any) => (uc.channel ? uc.channel.syobocal_cid : uc.syobocal_cid));
  // 必要に応じて他のAPI呼び出し・ロジックもここに追加
  return { channelIds, userChannels };
}
