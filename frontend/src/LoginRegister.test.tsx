import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginRegister from "./LoginRegister";

describe("LoginRegister", () => {
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    mockOnAuthSuccess.mockReset();
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it("新規登録→ログアウト→再ログインの正常系フロー", async () => {
    // 新規登録APIモック
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "dummy-token-1",
        user: { id: 10, username: "flowuser", email: "flow@example.com" },
      }),
    });

    // App風の認証状態管理
    let token: string | null = null;
    let user: any = null;
    const handleAuthSuccess = (t: string, u: any) => {
      token = t;
      user = u;
      localStorage.setItem("token", t);
      localStorage.setItem("user", JSON.stringify(u));
    };

    render(<LoginRegister onAuthSuccess={handleAuthSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));
    fireEvent.change(screen.getByLabelText("ユーザー名"), { target: { value: "flowuser" } });
    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "flow@example.com" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "flowpass" } });
    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(token).toBe("dummy-token-1");
      expect(user).toEqual({ id: 10, username: "flowuser", email: "flow@example.com" });
      expect(localStorage.getItem("token")).toBe("dummy-token-1");
    });

    // ログアウト処理
    token = null;
    user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    expect(localStorage.getItem("token")).toBeNull();

    // 再度ログインAPIモック
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "dummy-token-2",
        user: { id: 10, username: "flowuser", email: "flow@example.com" },
      }),
    });

    // 再度ログイン
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "flow@example.com" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "flowpass" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(token).toBe("dummy-token-2");
      expect(user).toEqual({ id: 10, username: "flowuser", email: "flow@example.com" });
      expect(localStorage.getItem("token")).toBe("dummy-token-2");
    });
  });

  afterEach(() => {
    // @ts-ignore
    global.fetch.mockRestore && global.fetch.mockRestore();
  });

  it("ログイン画面の初期UIが表示される", () => {
    render(<LoginRegister onAuthSuccess={mockOnAuthSuccess} />);
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("新規登録画面に切り替わる", () => {
    render(<LoginRegister onAuthSuccess={mockOnAuthSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));
    expect(screen.getByRole("heading", { name: "新規登録" })).toBeInTheDocument();
    expect(screen.getByLabelText("ユーザー名")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新規登録" })).toBeInTheDocument();
  });

  it("ログイン成功時にonAuthSuccessが呼ばれる", async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "dummy-token",
        user: { id: 1, username: "testuser", email: "test@example.com" },
      }),
    });

    render(<LoginRegister onAuthSuccess={mockOnAuthSuccess} />);
    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(
        "dummy-token",
        { id: 1, username: "testuser", email: "test@example.com" }
      );
    });
  });

  it("新規登録成功時にonAuthSuccessが呼ばれる", async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "dummy-token",
        user: { id: 2, username: "newuser", email: "new@example.com" },
      }),
    });

    render(<LoginRegister onAuthSuccess={mockOnAuthSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));
    fireEvent.change(screen.getByLabelText("ユーザー名"), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "password456" } });
    fireEvent.click(screen.getByRole("button", { name: "新規登録" }));

    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(
        "dummy-token",
        { id: 2, username: "newuser", email: "new@example.com" }
      );
    });
  });

  it("APIエラー時にエラーメッセージが表示される", async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "認証エラー" }),
    });

    render(<LoginRegister onAuthSuccess={mockOnAuthSuccess} />);
    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "fail@example.com" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("認証エラー")).toBeInTheDocument();
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });

  it("通信エラー時にエラーメッセージが表示される", async () => {
    // @ts-ignore
    global.fetch.mockRejectedValueOnce(new Error("network error"));

    render(<LoginRegister onAuthSuccess={mockOnAuthSuccess} />);
    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "fail@example.com" } });
    fireEvent.change(screen.getByLabelText("パスワード"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("通信エラーが発生しました")).toBeInTheDocument();
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });
});
