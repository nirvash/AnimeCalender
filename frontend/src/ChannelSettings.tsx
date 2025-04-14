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

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('チャンネル一覧の取得に失敗しました');
      const data = await response.json();
      console.log('Channels response:', data);
      setChannels(data);
      // 初期状態ではキー局のみを選択状態にする
      const keyStations = data.filter((ch: Channel) => isKeyStation(ch));
      setSelectedChannels(keyStations.map((ch: Channel) => ch.id));
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

  const groupedChannels = channels.reduce((groups: { name: string, channels: Channel[] }[], channel) => {
    const groupName = channel.area || '未分類';
    const group = groups.find(g => g.name === groupName);
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

  // グループを地域名でソート
  groupedChannels.sort((a, b) => a.name.localeCompare(b.name));

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