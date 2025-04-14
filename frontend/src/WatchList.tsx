import { useState, useEffect } from 'react';
import styles from './WatchList.module.css';

interface Props {
  token: string;
}

interface Anime {
  id: number;
  title: string;
  syobocal_tid: string;
}

interface Channel {
  id: number;
  name: string;
  syobocal_cid: string;
}

interface Episode {
  id: number;
  pid: number;
  st_time: string;
  ed_time: string;
  sub_title: string | null;
  prog_comment: string | null;
  anime: Anime;
  channel: Channel;
}

type TabType = 'watching' | 'unwatched';

export default function WatchList({ token }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('watching');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEpisodes(activeTab);
  }, [activeTab]);

  const fetchEpisodes = async (tab: TabType) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/watchlist/${tab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('エピソードの取得に失敗しました');
      }

      const data = await response.json();
      // 日時でソート
      const sortedData = data.sort((a: Episode, b: Episode) => 
        new Date(a.st_time).getTime() - new Date(b.st_time).getTime()
      );
      setEpisodes(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  const errorMessage = error && (
    <div className={styles.error}>
      <span>{error}</span>
      <button onClick={() => setError(null)} className={styles.errorCloseButton}>×</button>
    </div>
  );

  return (
    <div className={styles.container}>
      {errorMessage}
      
      <div className={styles.header}>
        <h1>視聴リスト</h1>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'watching' ? styles.active : ''}`}
          onClick={() => setActiveTab('watching')}
        >
          視聴中
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'unwatched' ? styles.active : ''}`}
          onClick={() => setActiveTab('unwatched')}
        >
          未視聴
        </button>
      </div>

      {episodes.length === 0 ? (
        <div className={styles.noData}>
          {activeTab === 'watching' ? (
            '視聴中のアニメはありません'
          ) : (
            '新規の放送アニメはありません'
          )}
        </div>
      ) : (
        <div className={styles.episodeList}>
          {episodes.map(episode => (
            <div key={episode.id} className={styles.episodeCard}>
              <div className={styles.title}>{episode.anime.title}</div>
              <div className={styles.metadata}>
                <span className={styles.channelName}>{episode.channel.name}</span>
                {episode.sub_title && (
                  <span className={styles.subtitle}>「{episode.sub_title}」</span>
                )}
              </div>
              <div className={styles.datetime}>
                {formatDateTime(episode.st_time)}
                {' 〜 '}
                {formatDateTime(episode.ed_time)}
              </div>
              {episode.prog_comment && (
                <div className={styles.comment}>{episode.prog_comment}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}