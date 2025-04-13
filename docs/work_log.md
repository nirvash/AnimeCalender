# 作業記録

## 2025-04-13 タイムテーブル表示API実装（4.1）とタイムテーブル表示画面実装（4.2）

- docs/implementation_plan.md「4.1 バックエンドAPI（番組データ取得、視聴中/全タイトル切替対応）」の要件に基づき、`backend/src/index.ts` に `/api/timetable` エンドポイントを実装
- JWT認証ミドルウェア (`authenticateToken`) を適用
- クエリパラメータ (`startDate`, `endDate`, `watchingOnly`) を受け付け、指定期間の `Episode` データを取得
- `watchingOnly=true` の場合、ログインユーザーが視聴中 (`status='watching'`) のアニメのみに絞り込み
- 取得データには関連する `Anime` および `Channel` の情報を含める
- Prismaのクエリで `st_time` による期間フィルタリングとソート (`orderBy: { st_time: 'asc' }`) を実装
- TypeScriptのエラー（重複プロパティ定義）を修正
- docs/implementation_plan.md「4.2 フロントエンド（タイムテーブル画面、切替UI）」の要件に基づき、`frontend/src/Timetable.tsx` を新規作成
  - 期間選択（1日/3日/7日）と視聴中/全タイトル切り替えのUIを実装
  - `/api/timetable` から番組データを取得し、リスト表示
  - 日付移動機能（前日/今日/翌日）を実装
  - `frontend/src/App.tsx` を修正し、認証後に `Timetable` コンポーネントを表示するように変更
  - JSXのエラー（HTMLエンティティ）を修正

---

## 2025-04-13 実装計画 1. プロジェクト初期セットアップ 完了

- docs/implementation_plan.md「4.1 バックエンドAPI（番組データ取得、視聴中/全タイトル切替対応）」の要件に基づき、`backend/src/index.ts` に `/api/timetable` エンドポイントを実装
- JWT認証ミドルウェア (`authenticateToken`) を適用
- クエリパラメータ (`startDate`, `endDate`, `watchingOnly`) を受け付け、指定期間の `Episode` データを取得
- `watchingOnly=true` の場合、ログインユーザーが視聴中 (`status='watching'`) のアニメのみに絞り込み
- 取得データには関連する `Anime` および `Channel` の情報を含める
- Prismaのクエリで `st_time` による期間フィルタリングとソート (`orderBy: { st_time: 'asc' }`) を実装
- TypeScriptのエラー（重複プロパティ定義）を修正

---

## 2025-04-13 実装計画 1. プロジェクト初期セットアップ 完了

- .gitignore を技術スタックに合わせて作成
- frontend/（Vite + React + TypeScript）ディレクトリを作成し初期化・依存パッケージ導入
- backend/（Node.js + Express + TypeScript + Prisma + SQLite3）ディレクトリを作成し初期化・依存パッケージ導入
- backend/ に tsconfig.json を生成
- .github/workflows/ci.yml にてフロント・バックエンドのビルド/型チェックを行うGitHub Actionsワークフロー雛形を作成

---

## 2025-04-13 フロントエンド認証画面・認証フロー実装・テスト自動化（3.2/3完了）

- docs/implementation_plan.md「3.2 フロントエンド（ログイン/新規登録画面、認証フロー）」の要件に従い、以下を実装
  - ログイン/新規登録画面（LoginRegister.tsx）を新規作成し、UI・バリデーション・エラーハンドリングを実装
  - 認証API（/api/auth/login, /api/auth/register）と連携し、正常時はJWTトークン・ユーザー情報をlocalStorageに保存
  - App.tsxで認証状態（トークン有無）による画面切り替え（未認証時はログイン/新規登録画面、認証済み時はメイン画面プレースホルダー）を実装
  - ログアウト機能を実装
  - 必要なスタイル（App.css）を追加し、UIを整備
- LoginRegister.test.tsxで正常系・異常系・統合フロー（新規登録→ログアウト→再ログイン）を含む自動テストを追加し、全テストパスを確認
- 設計ドキュメント（ui_design.md, implementation_plan.md）に準拠し、要件逸脱なし
- docs/implementation_plan.mdの3.1/3.2/3全体の進捗を[x]に更新し、「ユーザー認証」機能全体が完了

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
