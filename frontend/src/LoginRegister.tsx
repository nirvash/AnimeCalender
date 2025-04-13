import React, { useState } from "react";

type AuthMode = "login" | "register";

interface Props {
  onAuthSuccess: (token: string, user: { id: number; username: string; email: string }) => void;
}

const LoginRegister: React.FC<Props> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? `/api/auth/login` : `/api/auth/register`;
      const body =
        mode === "login"
          ? { email, password }
          : { username, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "エラーが発生しました");
        setLoading(false);
        return;
      }
      onAuthSuccess(data.token, data.user);
    } catch (err: Error | unknown) {
      console.error('認証エラー:', err);
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{mode === "login" ? "ログイン" : "新規登録"}</h2>
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <div>
            <label htmlFor="username-input">ユーザー名</label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
        )}
        <div>
          <label htmlFor="email-input">メールアドレス</label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password-input">パスワード</label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "送信中..." : mode === "login" ? "ログイン" : "新規登録"}
        </button>
      </form>
      <div style={{ marginTop: 16 }}>
        {mode === "login" ? (
          <>
            アカウントをお持ちでない方は{" "}
            <button type="button" onClick={() => setMode("register")}>
              新規登録
            </button>
          </>
        ) : (
          <>
            既にアカウントをお持ちの方は{" "}
            <button type="button" onClick={() => setMode("login")}>
              ログイン
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginRegister;
