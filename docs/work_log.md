# 作業記録

## 2025-04-13 実装計画 1. プロジェクト初期セットアップ 完了

- .gitignore を技術スタックに合わせて作成
- frontend/（Vite + React + TypeScript）ディレクトリを作成し初期化・依存パッケージ導入
- backend/（Node.js + Express + TypeScript + Prisma + SQLite3）ディレクトリを作成し初期化・依存パッケージ導入
- backend/ に tsconfig.json を生成
- .github/workflows/ci.yml にてフロント・バックエンドのビルド/型チェックを行うGitHub Actionsワークフロー雛形を作成

---

## 2025-04-13 ユーザー認証API（3.1）実装・動作確認

- docs/implementation_plan.md「3.1 バックエンドAPI（登録・ログイン・JWT認証）」の要件に従い、Express+Prismaで認証API（/api/auth/register, /api/auth/login, JWT認証ミドルウェア）を実装
- Prismaスキーマのモデル名・リレーション名をPascalCaseに統一し、Client再生成・マイグレーションリセットを実施
- TypeScript型エラー（Express型定義・req.user拡張等）に対応し、APIサーバが正常起動することを確認
- APIの登録・ログイン・JWT認証フローが正常に動作することを確認

## 2025-04-13 DB設計・Prismaスキーマ作成

- docs/data_model.md, システム構成、APIサンプルに基づきDB設計を実施
- backend/schema.prisma を新規作成
- USER, ANIME, CHANNEL, USER_ANIME, USER_CHANNEL モデルを定義
- 各アニメ放送回（エピソード）を管理する EPISODE テーブルを追加
- CHANNEL テーブルをChItemサンプルに合わせて拡張（ChName, ChiEPGName, ChURL, ChEPGURL, ChComment, ChGID, ChNumber, LastUpdate等を追加）
- ANIMEテーブルから放送局・曜日・放送時間等を分離し正規化
- マイグレーション・DB生成は未実施（ユーザ指示により保留）

---

## 2025-04-13 2.1 マイグレーション実行・DBファイル生成

- `npx prisma migrate dev --name init` を実行し、SQLiteデータベース（dev.db）とマイグレーションファイル（migrations/）を生成
- Prismaスキーマのリレーション定義エラーに対応（CHANNELとUSER_ANIMEのリレーション修正）
- DBスキーマとPrisma Clientが最新状態に同期されたことを確認
