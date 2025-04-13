# しょぼいカレンダーAPI連携仕様

## 概要
- しょぼいカレンダーAPI（https://cal.syoboi.jp/doc/）からアニメ番組の放送データを取得し、アプリ内の番組データベースを自動更新する。

---

## 主な利用APIエンドポイント

- 番組一覧取得: `http://cal.syoboi.jp/db.php?Command=TitleLookup`
- 放送予定取得: `http://cal.syoboi.jp/db.php?Command=ProgLookup`
- 放送局一覧取得: `http://cal.syoboi.jp/db.php?Command=ChLookup`
- データ形式: XML（JSON変換して利用）

---

## 取得データ例

- Title（番組タイトルID、タイトル名、略称、公式サイトURL等）
- Prog（放送日時、放送局、話数、サブタイトル等）
- Ch（放送局ID、局名、地域等）

---

## 連携タイミング

- バックエンドで定期的（例：1日1回、または数時間ごと）に自動取得（node-cron等でスケジューリング）
- フロントエンドの「今すぐ更新」ボタン押下時に手動取得

---

## データマッピング方針

- Title → ANIMEテーブル（syobocal_tid, title, broadcaster, start_date, end_date等）
- Prog → 放送日時・話数情報（ANIMEテーブルの放映曜日・時刻、USER_ANIMEの視聴管理に反映）
- Ch → 放送局名・地域情報

---

## データ更新方針

- 既存データと比較し、差分（新規追加・変更・削除）を反映
- 放送時間変更や新番組追加時はユーザーに通知可能（拡張）

---

## 備考

- APIアクセス制限・利用規約に注意
- 必要に応じてキャッシュやリトライ処理を実装
