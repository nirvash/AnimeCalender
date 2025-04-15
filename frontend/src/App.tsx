import { useState, useEffect, useCallback } from "react"; // useCallback を追加

console.log('Debug: VITE_BACKEND_URL =', import.meta.env.VITE_BACKEND_URL);
import "./App.css";
import LoginRegister from "./LoginRegister";
import Timetable from "./Timetable";
import ChannelSettings from "./ChannelSettings";
import WatchList from "./WatchList";

type User = { id: number; username: string; email: string };

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'timetable' | 'settings' | 'watchlist'>('timetable');
  const [channelSettingsVersion, setChannelSettingsVersion] = useState<number>(0); // 放送局設定のバージョン

  // 初回マウント時にlocalStorageからトークン復元
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // 放送局設定が保存されたときに呼び出されるコールバック
  const handleSettingsSaved = useCallback(() => {
    setChannelSettingsVersion(prevVersion => prevVersion + 1);
    console.log('Channel settings saved, version incremented:', channelSettingsVersion + 1);
  });

  if (!token || !user) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #ddd" }}>
        <h2 style={{ margin: 0 }}>Animeカレンダー</h2>
        <div>
          <span>{user.username} さん</span>
          <button onClick={handleLogout} style={{ marginLeft: 12 }}>
            ログアウト
          </button>
        </div>
      </header>
      <nav style={{ borderBottom: "1px solid #ddd", padding: "0 24px" }}>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`tabButton ${activeTab === 'timetable' ? 'activeTabButton' : ''}`} // クラスを追加
          style={{ // color 以外を維持
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === 'timetable' ? "2px solid #007bff" : "none",
            cursor: "pointer"
          }}
        >
          番組表
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`tabButton ${activeTab === 'settings' ? 'activeTabButton' : ''}`} // クラスを追加
          style={{ // color 以外を維持
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === 'settings' ? "2px solid #007bff" : "none",
            cursor: "pointer"
          }}
        >
          放送局設定
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`tabButton ${activeTab === 'watchlist' ? 'activeTabButton' : ''}`} // クラスを追加
          style={{ // color 以外を維持
            padding: "12px 24px",
            border: "none",
            background: "none",
            borderBottom: activeTab === 'watchlist' ? "2px solid #007bff" : "none",
            cursor: "pointer"
          }}
        >
          視聴リスト
        </button>
      </nav>
      <main style={{ padding: "24px" }}>
        {activeTab === 'timetable' && <Timetable token={token} channelSettingsVersion={channelSettingsVersion} />} {/* channelSettingsVersion を渡す */}
        {activeTab === 'settings' && <ChannelSettings token={token} onSettingsSaved={handleSettingsSaved} />} {/* onSettingsSaved を渡す */}
        {activeTab === 'watchlist' && <WatchList token={token} />}
      </main>
    </div>
  );
}

export default App;
