import { useState, useEffect } from "react";
import "./App.css";
import LoginRegister from "./LoginRegister";

type User = { id: number; username: string; email: string };

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

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

  if (!token || !user) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  // 認証済み: メイン画面（タブUIは今後実装）
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Animeカレンダー</h2>
        <div>
          <span>{user.username} さん</span>
          <button onClick={handleLogout} style={{ marginLeft: 12 }}>
            ログアウト
          </button>
        </div>
      </header>
      <main>
        <p>メイン画面（タブUIは今後実装）</p>
      </main>
    </div>
  );
}

export default App;
