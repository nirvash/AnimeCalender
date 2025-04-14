import React, { useState, useEffect } from 'react';
import styles from './Timetable.module.css';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TodayIcon from '@mui/icons-material/Today';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
// Episodeデータの型定義（APIレスポンスに合わせて調整が必要）
// backend/schema.prisma や API実装を参考に定義
// ユーザーの選択した放送局の型定義
type Channel = {
  id: number;
  name: string;
  syobocal_cid: string;
  area: string;
};

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
  is_watching?: boolean; // 視聴中フラグ（APIレスポンスに含まれる場合）
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
      // ユーザーの選択した放送局を取得
      const userChannelsResponse = await fetch('/api/user/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userChannelsResponse.ok) {
        throw new Error('放送局設定の取得に失敗しました');
      }

      const userChannels = await userChannelsResponse.json();
      // syobocal_cidを文字列として送信
      const channelIds = userChannels
        .map((ch: Channel) => ch.syobocal_cid?.toString())
        .filter(Boolean)
        .join(',');

      // タイムテーブルデータを取得（選択された放送局でフィルタリング）
      const response = await fetch(`/api/timetable?startDate=${startDate}&endDate=${endDate}&watchingOnly=${watchingOnly}&channels=${channelIds}`, {
        headers: {
          'Authorization': `Bearer ${token}`
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

  // グリッド用日付配列生成
  const { startDate, endDate } = calculateDateRange(viewMode, currentDate);
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // 22:00〜28:00（翌4:00）までの30分単位の時間ラベル
  const timeLabels: string[] = [];
  for (let h = 22; h <= 28; h++) {
    const displayHour = h.toString().padStart(2, '0');
    timeLabels.push(`${displayHour}:00`);
    timeLabels.push(`${displayHour}:30`);
  }

  // 番組ごとの視聴中状態をローカルで管理（API連携は今後）
  const [watchingMap, setWatchingMap] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    // エピソード取得時に初期値セット
    const map: { [id: number]: boolean } = {};
    episodes.forEach(ep => {
      map[ep.id] = ep.is_watching ?? false;
    });
    setWatchingMap(map);
  }, [episodes]);

  // 番組を日付・時間ごとにグリッド配置するためのマッピング
  const getCellPrograms = (date: Date, time: string) => {
    // 指定日・時刻に開始する番組を抽出
    return episodes.filter(ep => {
      const st = new Date(ep.st_time);
      return (
        st.getFullYear() === date.getFullYear() &&
        st.getMonth() === date.getMonth() &&
        st.getDate() === date.getDate() &&
        st.getHours() === parseInt(time.split(':')[0], 10) &&
        (time.endsWith(':30') ? st.getMinutes() >= 30 : st.getMinutes() < 30)
      );
    });
  };

  // 視聴中トグル
  const handleToggleWatching = (id: number) => {
    setWatchingMap(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
    // TODO: API連携でサーバーに反映
  };

  return (
    <div className={styles.timetableContainer}>
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            onClick={fetchTimetableData}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            データ更新
          </button>
          {isLoading && <span>更新中...</span>}
        </div>
        <h3>タイムテーブル <span style={{ fontWeight: 400, fontSize: '1rem' }}>({getDateRangeString()})</span></h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Tooltip title="前の日/週">
            <span>
              <IconButton onClick={handlePrevDate} color="primary">
                <ArrowBackIosNewIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="今日">
            <span>
              <IconButton onClick={handleToday} color="primary">
                <TodayIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="次の日/週">
            <span>
              <IconButton onClick={handleNextDate} color="primary">
                <ArrowForwardIosIcon />
              </IconButton>
            </span>
          </Tooltip>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'day' | '3days' | 'week')}>
            <option value="day">1日</option>
            <option value="3days">3日</option>
            <option value="week">週</option>
          </select>
          <span style={{ fontSize: '0.98rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              視聴中のみ
              <input
                type="checkbox"
                checked={watchingOnly}
                onChange={(e) => setWatchingOnly(e.target.checked)}
              />
            </label>
          </span>
        </div>
      </div>

      {isLoading && <p>読み込み中...</p>}
      {error && <p style={{ color: 'red' }}>エラー: {error}</p>}

      {!isLoading && !error && (
        <div
          className={styles.grid}
          style={{ '--days': days.length } as React.CSSProperties}
        >
          {/* 日付ヘッダー */}
          <div className={styles.timeAxis} style={{ gridRow: '1', gridColumn: '1' }}></div>
          {days.map((date, idx) => (
            <div
              key={idx}
              className={styles.dateHeader}
              style={{
                gridRow: 1,
                gridColumn: idx + 2,
              }}
            >
              {date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
            </div>
          ))}

          {/* 時間軸 */}
          {timeLabels.map((label, i) => (
            <div
              key={label}
              className={styles.timeAxis}
              style={{
                gridRow: i + 2,
                gridColumn: 1,
              }}
            >
              {label}
            </div>
          ))}

          {/* 番組セル */}
          {days.map((date, dayIdx) =>
            timeLabels.map((label, timeIdx) => {
              // この枠の開始時刻に始まる番組のみを抽出
              const progs = getCellPrograms(date, label).filter((ep) => {
                const st = new Date(ep.st_time);
                // 枠の時刻と完全一致（30分単位）
                return (
                  st.getHours() === parseInt(label.split(':')[0], 10) &&
                  (label.endsWith(':30') ? st.getMinutes() === 30 : st.getMinutes() === 0)
                );
              });
              if (progs.length === 0) return null;

              // 横並びにするためflexラップ
              return (
                <div
                  key={`${date.toISOString()}-${label}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '4px',
                    gridRow: timeIdx + 2,
                    gridColumn: dayIdx + 2,
                    gridRowEnd: 'span 1',
                    overflowX: 'auto',
                  }}
                >
                  {progs.map((ep) => {
                    // セルの高さ計算（30分単位でスパン）
                    const st = new Date(ep.st_time);
                    const ed = new Date(ep.ed_time);
                    const diffMin = Math.max(30, (ed.getTime() - st.getTime()) / 60000);
                    const rowSpan = Math.ceil(diffMin / 30);

                    // 視聴中判定（ローカル状態）
                    const isWatching = watchingMap[ep.id] ?? false;

                    return (
                      <div
                        key={ep.id}
                        className={`${styles.programCell} ${isWatching ? styles.watching : ''}`}
                        style={{
                          minWidth: 120,
                          flex: '1 1 120px',
                          gridRowEnd: `span ${rowSpan}`,
                        }}
                      >
                        <div className={styles.programTitle}>{ep.anime.title}</div>
                        <div className={styles.programMeta}>
                          {st.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜
                          {ed.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} / {ep.channel.name}
                        </div>
                        <div className={styles.programMeta}>
                          {ep.count ? `#${ep.count}` : ''} {ep.sub_title || ''}
                        </div>
                        <div className={styles.checkbox}>
                          <Checkbox
                            checked={isWatching}
                            icon={<RadioButtonUncheckedIcon />}
                            checkedIcon={<CheckCircleIcon />}
                            color="primary"
                            inputProps={{ 'aria-label': '視聴中' }}
                            onChange={() => handleToggleWatching(ep.id)}
                            sx={{ padding: 0, marginRight: 0.5 }}
                          />
                          <span style={{ fontSize: '0.92rem' }}>視聴中</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Timetable;
