import React, { useState, useEffect, useCallback } from 'react';
import styles from './Timetable.module.css';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TodayIcon from '@mui/icons-material/Today';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { getTodayDate28h, addDays28h, getTimetableDisplayRange } from './timetableDateUtils';
import type { Date28h } from './timetableDateUtils';
import { fetchTimetableDataCore } from './TimetableCore';

// Episodeデータの型定義（APIレスポンスに合わせて調整が必要）
// backend/schema.prisma や API実装を参考に定義
// ユーザーの選択した放送局の型定義

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
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null); // 番組詳細モーダル用
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [viewMode, setViewMode] = useState<'day' | '3days' | 'week'>('day'); // 表示期間モード
  const [watchingOnly, setWatchingOnly] = useState<boolean>(false); // 視聴中のみ表示フラグ
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // 画面の「基準日」: 28時制で補正された日付のみを保持
// currentBaseDate28hは常に0:00 JSTのDate（午前4時までは前日扱い）
const [currentBaseDate28h, setCurrentBaseDate28h] = useState<Date28h>(getTodayDate28h(new Date()));

  // viewModeとcurrentBaseDate28hに基づいてstartDateとendDateを計算する関数
  // 28時制の基準日（0:00 JST）から、1日分は0:00〜翌4:00とする

  // APIからタイムテーブルデータを取得する関数
  const fetchTimetableData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // fetchTimetableDataCoreでチャンネル情報を取得
      const { channelIds } = await fetchTimetableDataCore({
        token,
        viewMode,
        currentBaseDate28h,
      });
      const { startDateTime, endDateTime } = getTimetableDisplayRange(viewMode, currentBaseDate28h);
      const channelsParam = channelIds.filter(Boolean).join(',');
      // タイムテーブルデータを取得
      const response = await fetch(`/api/timetable?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&watchingOnly=${watchingOnly}&channels=${channelsParam}`, {
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
      // JST表示用に変換
      const toJstString = (iso: string) => {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
      };
      console.log(`[fetchTimetableData] fetch episodes: from ${toJstString(startDateTime)} (JST) to ${toJstString(endDateTime)} (JST)`);
      console.log("Episodes:", data);
    } catch (error) {
      console.error("Failed to fetch timetable data:", error);
      setError(error instanceof Error ? error.message : 'データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, watchingOnly, currentBaseDate28h, token]);

  // viewMode, watchingOnly, currentBaseDate28h が変更されたらデータを再取得
  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  // 日付移動ハンドラ
  // 前日・前期間へ移動（28時制基準）
const handlePrevDate = () => {
  const daysToSubtract = viewMode === 'week' ? 7 : (viewMode === '3days' ? 3 : 1);
  setCurrentBaseDate28h(addDays28h(currentBaseDate28h, -daysToSubtract));
};

  // 翌日・次期間へ移動（28時制基準）
const handleNextDate = () => {
  const daysToAdd = viewMode === 'week' ? 7 : (viewMode === '3days' ? 3 : 1);
  setCurrentBaseDate28h(addDays28h(currentBaseDate28h, daysToAdd));
};

  // 「今日」ボタン（28時制基準）
const handleToday = () => {
  const now = new Date();
  const today28h = getTodayDate28h(now);
  console.log('[handleToday] now:', now, '→ today28h:', today28h, today28h.toISOString());
  setCurrentBaseDate28h(today28h);
};

  // 表示期間の文字列生成
  const getDateRangeString = () => {
    const { startDateTime, endDateTime } = getTimetableDisplayRange(viewMode, currentBaseDate28h);
    // 表示用：日付部分だけ取り出し（例: 2025-04-15 22:00 〜 2025-04-16 04:00）
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const startStr = `${start.getFullYear()}-${(start.getMonth()+1).toString().padStart(2,'0')}-${start.getDate().toString().padStart(2,'0')} ${start.getHours().toString().padStart(2,'0')}:00`;
    const endStr = `${end.getFullYear()}-${(end.getMonth()+1).toString().padStart(2,'0')}-${end.getDate().toString().padStart(2,'0')} ${end.getHours().toString().padStart(2,'0')}:00`;
    return `${startStr} 〜 ${endStr}`;
  }

  // グリッド用日付配列生成
  // 28時制ベースで日付列を生成
  let numDays = 1;
  if (viewMode === '3days') numDays = 3;
  if (viewMode === 'week') numDays = 7;
  const days: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = addDays28h(currentBaseDate28h, i);
    days.push(d);
  }

  // 22:00〜28:00（翌4:00）までの時間ラベル（1時間単位で柔軟に生成）
  // 30分単位のグリッド依存を廃止し、1時間ごとにラベルを表示
  const timetableStartHour = 22;
  const timetableEndHour = 28; // 28時=翌4時
  const timeLabels: string[] = [];
  // 28:00（04:00）はラベル・線を描画しないため27:00まで
  for (let h = timetableStartHour; h < timetableEndHour; h++) {
    const displayHour = (h >= 24 ? h - 24 : h).toString().padStart(2, '0');
    timeLabels.push(`${displayHour}:00`);
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
  // 不要なgetCellPrograms関数を削除（30分枠依存のため未使用）

  // 視聴中トグル
  const handleToggleWatching = async (id: number) => {
    const newValue = !watchingMap[id];
    try {
      setIsLoading(true);
      setError(null);
      // PATCHリクエストで視聴中状態をサーバーに送信
      const res = await fetch(`/api/watchlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_watching: newValue })
      });
      if (!res.ok) {
        let errorMsg = `Error: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch { /* ignore */ }
        throw new Error(errorMsg);
      }
      setWatchingMap(prev => ({ ...prev, [id]: newValue }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '視聴中状態の更新に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

 return (
   <>
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
           <div
             className={styles.timeAxis}
             style={{
               gridRow: '2 / span 49',
               gridColumn: '1',
               position: 'relative',
               minWidth: 60,
               height: '1440px', // 番組セルと同じ高さ
               paddingTop: '16px',
               boxSizing: 'border-box',
             }}
           >
             {/* 1時間ごとの横線 */}
             {timeLabels.map((label, idx) => {
               if (idx === 0) return null;
               const hour = parseInt(label.split(':')[0], 10);
               let minutesFrom22 = (hour >= 22 ? hour : hour + 24) - 22;
               minutesFrom22 = minutesFrom22 * 60;
               return (
                 <div
                   key={`line-axis-${label}`}
                   style={{
                     position: 'absolute',
                     top: `${(minutesFrom22 / 360) * 100}%`,
                     left: 0,
                     width: '100%',
                     borderTop: '1px solid #e0e0e0',
                     zIndex: 1,
                     pointerEvents: 'none',
                   }}
                 />
               );
             })}
             {/* 時刻ラベル */}
             {timeLabels.map((label) => {
               const hour = parseInt(label.split(':')[0], 10);
               let minutesFrom22 = (hour >= 22 ? hour : hour + 24) - 22;
               minutesFrom22 = minutesFrom22 * 60;
               return (
                 <div
                   key={label}
                   style={{
                     position: 'absolute',
                     top: `${(minutesFrom22 / 360) * 100}%`,
                     left: 0,
                     width: '100%',
                     color: '#7a8a99',
                     fontSize: '0.95rem',
                     textAlign: 'right',
                     paddingRight: '0.7rem',
                     background: 'transparent',
                     lineHeight: 1.1,
                     pointerEvents: 'none',
                   }}
                 >
                   {label}
                 </div>
               );
             })}
           </div>
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
           {/* 時間軸ラベル（絶対配置）は削除 */}

           {/* 番組セル */}
           {days.map((date, dayIdx) => (
             <div key={date.toISOString()} style={{
               gridRow: '2 / span 49',
               gridColumn: dayIdx + 2,
               position: 'relative',
               minHeight: '1440px', // 6h * 60min * 4px
               minWidth: 120,
               borderLeft: '1px solid #e0e0e0',
                 background: '#fff',
               }}
             >
               {/* 1時間ごとの横線 */}
               {timeLabels.map((label, idx) => {
                 if (idx === 0) return null; // 22:00は一番上なので線不要
                 const hour = parseInt(label.split(':')[0], 10);
                 let minutesFrom22 = (hour >= 22 ? hour : hour + 24) - 22;
                 minutesFrom22 = minutesFrom22 * 60;
                 return (
                   <div
                     key={`line-${label}`}
                     style={{
                       position: 'absolute',
                       top: `${(minutesFrom22 / 360) * 100}%`,
                       left: 0,
                       width: '100%',
                       borderTop: '1px solid #e0e0e0',
                       zIndex: 1,
                       pointerEvents: 'none'
                     }}
                   />
                 );
               })}
               {(() => {
                 // その日の番組リスト
                 const dayEpisodes = episodes.filter(ep => {
                   const st = new Date(ep.st_time);
                   const st28h = getTodayDate28h(st);
                   return (
                     st28h.getFullYear() === date.getFullYear() &&
                     st28h.getMonth() === date.getMonth() &&
                     st28h.getDate() === date.getDate()
                   );
                 });
                 // 開始・終了分数を計算（22:00=0分, 28:00=360分）
                 // 22:00=0分, 28:00=360分
                 const getMinutes = (d: Date) => {
                   let h = d.getHours();
                   if (h < 5) h += 24; // 翌日4:59までを28時扱い
                   return (h - 22) * 60 + d.getMinutes();
                 };
                 // 重複判定: 開始・終了が被るものは横並び
                 const sorted = [...dayEpisodes].sort((a, b) => new Date(a.st_time).getTime() - new Date(b.st_time).getTime());
                 const columns: { ep: Episode; col: number; top: number; bottom: number }[] = [];
                 sorted.forEach(ep => {
                   const st = new Date(ep.st_time);
                   const ed = new Date(ep.ed_time);
                   const top = getMinutes(st);
                   const bottom = getMinutes(ed);
                   let col = 0;
                   while (columns.some(c => c.col === col && !(bottom <= c.top || top >= c.bottom))) {
                     col++;
                   }
                   columns.push({ ep, col, top, bottom });
                 });
                 const maxCol = columns.reduce((acc, cur) => Math.max(acc, cur.col), 0);
                 return columns.map(({ ep, col, top, bottom }) => {
                   const isWatching = watchingMap[ep.id] ?? false;
                   return (
                     <div
                       key={ep.id}
                       className={`${styles.programCell} ${isWatching ? styles.watching : ''}`}
                       style={{
                         position: 'absolute',
                         top: `${(top / 360) * 100}%`,
                         height: `${((bottom - top) / 360) * 100}%`,
                         left: `${(col / (maxCol + 1)) * 100}%`,
                         width: `${100 / (maxCol + 1)}%`,
                         minWidth: 120,
                         boxSizing: 'border-box',
                         zIndex: 2 + col,
                         padding: '0.3rem 0.5rem',
                         overflow: 'hidden',
                       }}
                     >
                       {/* 詳細表示ボタン（左上） */}
                       <IconButton
                         size="small"
                         style={{
                           position: 'absolute',
                           top: 2,
                           left: 2,
                           zIndex: 10,
                           background: 'rgba(255,255,255,0.7)',
                           padding: 2,
                         }}
                         onClick={(e) => {
                           e.stopPropagation();
                           setSelectedEpisode(ep);
                         }}
                         aria-label="詳細表示"
                       >
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                           <circle cx="12" cy="12" r="10" stroke="#1976d2" strokeWidth="2" fill="#fff"/>
                           <rect x="11" y="7" width="2" height="6" rx="1" fill="#1976d2"/>
                           <rect x="11" y="15" width="2" height="2" rx="1" fill="#1976d2"/>
                         </svg>
                       </IconButton>
                       <div
                         className={styles.programTitle}
                         style={{
                           whiteSpace: 'nowrap',
                           overflow: 'hidden',
                           textOverflow: 'ellipsis',
                         }}
                         title={ep.anime.title}
                       >
                         {ep.anime.title}
                       </div>
                       <div className={styles.programMeta}>
                         {new Date(ep.st_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜
                         {new Date(ep.ed_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} / {ep.channel.name}
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
                         <span style={{ fontSize: '0.92rem', color: '#222' }}>視聴中</span>
                       </div>
                     </div>
                   );
                 });
               })()}
             </div>
           ))}
         </div>
       )}
     </div>
     {selectedEpisode && (
       <div
         style={{
           position: 'fixed',
           top: 0,
           left: 0,
           width: '100vw',
           height: '100vh',
           background: 'rgba(0,0,0,0.35)',
           zIndex: 10000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
         }}
         onClick={() => setSelectedEpisode(null)}
       >
         <div
           style={{
             background: '#e6f0ff', // セルの背景色に合わせる
             color: '#222', // セルの文字色に合わせる
             borderRadius: 12,
             boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
             padding: '2rem',
             minWidth: 320,
             maxWidth: 480,
             maxHeight: '80vh',
             overflowY: 'auto',
             position: 'relative',
           }}
           onClick={e => e.stopPropagation()}
         >
           <button
             style={{
               position: 'absolute',
               top: 12,
               right: 12,
               background: 'transparent',
               border: 'none',
               fontSize: 24,
               cursor: 'pointer',
             }}
             onClick={() => setSelectedEpisode(null)}
             aria-label="閉じる"
           >×</button>
           <h2
             style={{
               marginTop: 0,
               fontSize: '1.25rem',
               fontWeight: 600,
               wordBreak: 'break-word',
               whiteSpace: 'normal',
             }}
           >
             {selectedEpisode?.anime.title}
           </h2>
           <div style={{ color: '#666', marginBottom: 8 }}>
             {selectedEpisode?.count ? `#${selectedEpisode?.count}` : ''} {selectedEpisode?.sub_title || ''}
           </div>
           <div style={{ color: '#444', marginBottom: 8 }}>
             {selectedEpisode ? new Date(selectedEpisode.st_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}〜
             {selectedEpisode ? new Date(selectedEpisode.ed_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''} / {selectedEpisode?.channel.name}
           </div>
           <div style={{ color: '#888', fontSize: '0.95rem' }}>
             番組ID: {selectedEpisode?.id}
           </div>
           <div className={styles.checkbox} style={{ marginTop: 12 }}>
             <Checkbox
               checked={!!watchingMap[selectedEpisode?.id ?? 0]}
               icon={<RadioButtonUncheckedIcon />}
               checkedIcon={<CheckCircleIcon />}
               color="primary"
               inputProps={{ 'aria-label': '視聴中' }}
               onChange={() => selectedEpisode && handleToggleWatching(selectedEpisode.id)}
               sx={{ padding: 0, marginRight: 0.5 }}
             />
             <span style={{ fontSize: '0.98rem', color: '#222' }}>視聴中</span>
           </div>
         </div>
       </div>
     )}
   </>
 );
}

export default Timetable;
