# 開発環境セットアップガイド

このドキュメントは、初めてこのリポジトリをクローンした開発者向けに、開発環境のセットアップ手順をまとめたものです。

## 前提条件
- Node.js（推奨バージョン: 最新のLTS）
- npm または yarn
- OpenSSL（開発用証明書生成に必要）
- Git

## セットアップ手順

### 1. リポジトリのクローン
```
git clone <このリポジトリのURL>
cd AnimeCalender
```

### 2. 依存パッケージのインストール
#### backend
```
cd backend
npm install
```
#### frontend
```
cd ../frontend
npm install
```

### 3. 開発用証明書の生成
（初回のみ、または `backend/server.crt`・`server.key` が無い場合）
```
cd ../backend/src/scripts
./generate-dev-cert.bat
```
※ Windows環境でOpenSSLが必要です。

### 4. データベースのセットアップ
（必要に応じて）
```
cd ../../backend
npx prisma migrate dev
npx ts-node src/scripts/seed-channels.ts
```

### 5. サーバ・フロントエンドの起動
#### backend（APIサーバ）
```
cd backend
npm run dev
```
#### frontend（フロントエンド）
```
cd frontend
npm run dev
```

---

## 補足
- `.env` ファイルが必要な場合は、各ディレクトリにサンプルや記載例を参照してください。
- 開発用証明書（server.crt, server.key）は `.gitignore` で管理されており、リポジトリには含まれません。
- その他詳細は docs/ 配下の各種ドキュメントを参照してください。
