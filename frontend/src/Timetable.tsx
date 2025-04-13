import React, { useState, useEffect } from 'react';

// Episodeデータの型定義（APIレスポンスに合わせて調整が必要）
// backend/schema.prisma や API実装を参考に定義
type Episode = {
  id: number;
  pid: number;
  st_time: string; // ISO 8601形式の文字列を想定
  ed_time: string; // ISO 8601形式の文字列を想定
  count: number | null;
  sub_title: string | null;
  anime: {
    id: number;
    title: string;
    syobocal_tid: string;
  };
  channel: {
    id: number;
    name: string;
    syobocal_cid: string;
  };
  // 他に必要なプロパティがあれば追加
};

type TimetableProps = {
  token: string; // API認証用トークン
};

const Timetable: React.FC<TimetableProps> = ({ token }) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [viewMode, setViewMode] = useState<'day' | '3days' | 'week'>('day'); // 表示期間モード
  const [watchingOnly, setWatchingOnly] = useState<boolean>(false); // 視聴中のみ表示フラグ
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date()); // 表示基準日

  // viewModeとcurrentDateに基づいてstartDateとendDateを計算する関数
  const calculateDateRange = (mode: 'day' | '3days' | 'week', baseDate: Date): { startDate: string, endDate: string } => {
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0); // 日付の開始時刻に設定

    const end = new Date(start);

    switch (mode) {
      case 'day':
        // 終了日は開始日と同じ
        break;
      case '3days':
        end.setDate(start.getDate() + 2); // 開始日 + 2日 = 3日間
        break;
      case 'week':
        end.setDate(start.getDate() + 6); // 開始日 + 6日 = 7日間
        break;
    }
    end.setHours(23, 59, 59, 999); // 日付の終了時刻に設定

    // YYYY-MM-DD形式にフォーマット
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    return { startDate: formatDate(start), endDate: formatDate(end) };
  };


  // APIからタイムテーブルデータを取得する関数
  const fetchTimetableData = async () => {
    setIsLoading(true);
    setError(null);
    const { startDate, endDate } = calculateDateRange(viewMode, currentDate);

    console.log("Token:", token); // トークンをコンソールに出力

    try {
      const response = await fetch(`/api/timetable?startDate=${startDate}&endDate=${endDate}&watchingOnly=${watchingOnly}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // エラーレスポンスの詳細を取得試行
        let errorMsg = `Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {
          // JSONパース失敗時はステータスコードのみ
        }
        throw new Error(errorMsg);
      }

      const data: Episode[] = await response.json();
      setEpisodes(data);
    } catch (error) {
      console.error("Failed to fetch timetable data:", error);
      setError(error instanceof Error ? error.message : 'データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // viewMode, watchingOnly, currentDate が変更されたらデータを再取得
  useEffect(() => {
    fetchTimetableData();
  }, [viewMode, watchingOnly, currentDate, token]); // tokenも依存配列に追加

  // 日付移動ハンドラ
  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    const daysToSubtract = viewMode === 'week' ? 7 : (viewMode === '3days' ? 3 : 1);
    newDate.setDate(currentDate.getDate() - daysToSubtract);
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    const daysToAdd = viewMode === 'week' ? 7 : (viewMode === '3days' ? 3 : 1);
    newDate.setDate(currentDate.getDate() + daysToAdd);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  }

  // 表示期間の文字列生成
  const getDateRangeString = () => {
    const { startDate, endDate } = calculateDateRange(viewMode, currentDate);
    if (startDate === endDate) {
      return startDate;
    }
    return `${startDate} 〜 ${endDate}`;
  }

  return (
    <div>
      <h3>タイムテーブル ({getDateRangeString()})</h3>
      {/* 操作UI */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {/* 日付移動 */}
        <div>
          <button onClick={handlePrevDate}>&lt;前</button>
          <button onClick={handleToday} style={{ margin: '0 0.5rem' }}>今日</button>
          <button onClick={handleNextDate}>次&gt;</button>
        </div>
        {/* 表示期間切り替え */}
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'day' | '3days' | 'week')}>
          <option value="day">1日</option>
          <option value="3days">3日</option>
          <option value="week">週</option>
        </select>
        {/* 視聴中のみ切り替え */}
        <label>
          <input
            type="checkbox"
            checked={watchingOnly}
            onChange={(e) => setWatchingOnly(e.target.checked)}
          />
          視聴中のみ
        </label>
      </div>

      {/* ローディング・エラー表示 */}
      {isLoading && <p>読み込み中...</p>}
      {error && <p style={{ color: 'red' }}>エラー: {error}</p>}

      {/* 番組リスト表示（仮） */}
      {!isLoading && !error && (
        <ul>
          {episodes.length > 0 ? (
            episodes.map((ep) => (
              <li key={ep.id}>
                {new Date(ep.st_time).toLocaleString()} - {ep.anime.title} ({ep.channel.name}) {ep.count ? `第${ep.count}話` : ''} {ep.sub_title || ''}
              </li>
            ))
          ) : (
            <p>表示する番組がありません。</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default Timetable;
