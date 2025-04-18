import { useState, useEffect } from 'react';
import styles from './ChannelSettings.module.css';

interface Props {
  token: string;
}

interface Channel {
  id: number;
  name: string;
  area: string | null;
  syobocal_cid: string;
}

interface UserChannel {
  channel_id: number;
  user_id: number;
  channel: Channel;
}

interface UpdateResponse {
  message: string;
  warning?: string;
  channels: UserChannel[];
}

interface UpdateResult {
  success: boolean;
  channelIds?: number[];
}

export default function ChannelSettings({ token }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  // キー局かどうかを判定する関数
  const isKeyStation = (channel: Channel) => {
    const keyStationNames = [
      'NHK総合',
      'NHK教育',
      '日本テレビ',
      'TBS',
      'フジテレビ',
      'テレビ朝日',
      'テレビ東京'
    ];
    return keyStationNames.some(name => channel.name.includes(name));
  };

  // area値を正規化する関数
  const normalizeArea = (area: string | null | undefined) => {
    if (!area || area.trim() === '') return '未分類';
    return area.trim();
  };

  const fetchChannels = async () => {
    try {
      // チャンネル一覧を取得
      const channelsResponse = await fetch('/api/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!channelsResponse.ok) throw new Error('チャンネル一覧の取得に失敗しました');
      const channelsData = await channelsResponse.json();
      // area値を正規化
      const normalizedChannels = channelsData.map((ch: Channel) => ({ ...ch, area: normalizeArea(ch.area) }));
      setChannels(normalizedChannels);

      // ユーザーの選択済み放送局を取得
      const userChannelsResponse = await fetch('/api/user/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userChannelsResponse.ok) {
        const userChannelsData = await userChannelsResponse.json();
        // UserChannel型の場合、channel_idまたはchannel.idを取得
        const userChannelIds = userChannelsData.map((uc: any) => {
          if (uc.channel_id) return uc.channel_id;
          if (uc.channel && uc.channel.id) return uc.channel.id;
          return uc.id;
        });
        setSelectedChannels(userChannelIds);
      } else {
        // ユーザー設定が未保存の場合はキー局を初期選択
        const keyStations = normalizedChannels.filter((ch: Channel) => isKeyStation(ch));
        setSelectedChannels(keyStations.map((ch: Channel) => ch.id));
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      setIsLoading(false);
    }
  };

  const saveUserChannels = async (channelIds: number[]): Promise<UpdateResult> => {
    try {
      setError(null);
      console.log('Saving user channels:', channelIds);
const response = await fetch('/api/user/channels', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ channelIds })
});

// デバッグ用
console.log('Request sent with channelIds:', channelIds);

const responseData = await response.json();
console.log('Response received:', responseData);

if (!response.ok) {
  throw new Error(responseData.message || '設定の更新に失敗しました');
}

const result = responseData as UpdateResponse;

// サーバーから返された実際の設定を使用
const updatedChannelIds = result.channels.map(ch => ch.channel_id);
return { success: true, channelIds: updatedChannelIds };
      return { success: true, channelIds: updatedChannelIds };
    } catch (err) {
      console.error('Error details:', err);
      console.error('Stack:', err instanceof Error ? err.stack : '');
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      return { success: false };
    }
  };

  const handleChannelToggle = async (channelId: number) => {
    const newSelectedChannels = selectedChannels.includes(channelId)
      ? selectedChannels.filter(id => id !== channelId)
      : [...selectedChannels, channelId];
    
    const result = await saveUserChannels(newSelectedChannels);
    if (result.success && result.channelIds) {
      setSelectedChannels(result.channelIds);
    }
  };

  const handleDeselectAll = async () => {
    const result = await saveUserChannels([]);
    if (result.success && result.channelIds) {
      setSelectedChannels(result.channelIds);
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  const errorMessage = error && (
    <div className={styles.error}>
      <span>{error}</span>
      <button onClick={() => setError(null)} className={styles.errorCloseButton}>×</button>
    </div>
  );

  // エリアの表示順序を定義
  const areaOrder = [
    '関東',
    '東京',
    'NHK',
    'BS',
    'CS',
    '関西',
    '中部',
    '北海道',
    '九州',
    '神奈川',
    '千葉',
    '埼玉',
    '兵庫',
    '未分類' // Ensure "未分類" is at the end
  ];

  // グループ化
  const groupedChannels = channels.reduce((groups: { name: string, channels: Channel[] }[], channel) => {
    const groupName = normalizeArea(channel.area);
    let group = groups.find(g => g.name === groupName);
    if (group) {
      group.channels.push(channel);
    } else {
      groups.push({
        name: groupName,
        channels: [channel]
      });
    }
    return groups;
  }, []);

  // グループをエリア順でソート
  groupedChannels.sort((a, b) => {
    const orderA = areaOrder.indexOf(a.name);
    const orderB = areaOrder.indexOf(b.name);
    const idxA = orderA !== -1 ? orderA : areaOrder.length;
    const idxB = orderB !== -1 ? orderB : areaOrder.length;
    // エリア名が同じ場合は五十音順
    if (idxA === idxB) return a.name.localeCompare(b.name, 'ja');
    return idxA - idxB;
  });

  return (
    <div className={styles.container}>
      {errorMessage}
      <div className={styles.header}>
        <h1>放送局設定</h1>
        <button 
          onClick={handleDeselectAll}
          className={styles.deselectButton}
          disabled={selectedChannels.length === 0}
        >
          全選択解除
        </button>
      </div>
      <p className={styles.description}>
        視聴する放送局を選択してください。選択した放送局の番組のみが番組表に表示されます。
      </p>
      
      {groupedChannels.map(group => (
        <div key={group.name} className={styles.group}>
          <h2 className={styles.groupName}>{group.name}</h2>
          <div className={styles.channelGrid}>
            {group.channels.map(channel => (
              <label key={channel.id} className={styles.channelItem}>
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channel.id)}
                  onChange={() => handleChannelToggle(channel.id)}
                  className={styles.checkbox}
                />
                <span className={styles.channelName}>{channel.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}