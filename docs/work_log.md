# 作業記録

## 2025-04-14: フロントエンド・バックエンドの起動設定

### 1. バックエンドの起動
1. 依存関係のインストール
```bash
cd backend
npm install
```

2. SSL証明書の生成（開発環境用）
```bash
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=localhost"
```

3. Prismaの初期設定
```bash
npx prisma generate
npx prisma migrate deploy
```

4. バックエンドサーバーの起動
```bash
npm run dev
```

### 2. フロントエンドの起動
1. 依存関係のインストール
```bash
cd frontend
npm install
```

2. 環境変数の設定
- `.env`ファイルを作成し、バックエンドのURLを設定
```
VITE_BACKEND_URL=https://localhost:3001
```

### 3. CORS・プロキシ設定の最適化
1. バックエンドのCORS設定（backend/src/index.ts）
```typescript
app.use(cors()); // すべてのオリジンを許可
```

2. フロントエンドのプロキシ設定（frontend/vite.config.ts）
```typescript
server: {
  proxy: {
    '/api': {
      target: 'https://localhost:3001',
      changeOrigin: true,
      secure: false
    },
  },
},
```

### 4. APIリクエストの設定
1. フロントエンドのAPIリクエスト設定
- 相対パスを使用してプロキシ経由でアクセス
- 認証トークンの設定
- エラーハンドリングの実装

### 5. 動作確認
- バックエンドサーバー: https://localhost:3001
- フロントエンド開発サーバー: http://localhost:5173
- APIリクエストとレスポンスの正常動作を確認
- 認証機能の動作を確認

### 注意点
- 開発環境では自己署名証明書を使用
- プロダクション環境では適切な証明書の設定が必要
- セキュリティ設定は開発環境用に最適化されており、本番環境では見直しが必要
