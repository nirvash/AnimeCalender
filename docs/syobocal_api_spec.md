# しょぼいカレンダーAPI仕様まとめ（db.php）

## 概要
- 公式ドキュメント: https://docs.cal.syoboi.jp/spec/db.php/
- しょぼいカレンダー（syobocal）のアニメ放送データを取得するためのAPI（db.php）仕様まとめ

---

## 主なエンドポイント

### 1. 番組タイトル情報取得（TitleLookup）
- URL例: `http://cal.syoboi.jp/db.php?Command=TitleLookup`
- 主なパラメータ:
    - `TID` : タイトルID（省略時は全件）
    - `Fields` : 取得フィールド指定（カンマ区切り）
    - `Limit` : 最大件数
    - `Order` : ソート順
- 用途: アニメタイトル一覧・詳細取得

### 2. 放送予定・エピソード情報取得（ProgLookup）
- URL例: `http://cal.syoboi.jp/db.php?Command=ProgLookup`
- 主なパラメータ:
    - `TID` : タイトルIDで絞り込み
    - `ChID` : 放送局IDで絞り込み
    - `Range` : 日付範囲（例: 20250401-20250430）
    - `Count` : 最大件数
- 用途: 放送スケジュール、エピソード情報取得

### 3. 放送局情報取得（ChLookup）
- URL例: `http://cal.syoboi.jp/db.php?Command=ChLookup`
- 主なパラメータ:
    - `ChID` : 放送局ID（省略時は全件）
- 用途: 放送局一覧取得

---

## レスポンス形式

- デフォルトはXML形式。

---

## 主な注意点・仕様

- **StTime, EdTime, LastUpdate等の日時は「YYYYMMDD_HHMMSS」形式で返却される**
- **ProgLookup等のRangeパラメータは「YYYYMMDD-YYYYMMDD」のようにハイフンで範囲指定する**
- 1分間あたりのリクエスト数制限あり（公式ドキュメント参照）
- データは随時更新されるため、キャッシュや定期取得推奨
- 文字コードはUTF-8
- レスポンスの構造はエンドポイントごとに異なる（上記例参照）
- API仕様は予告なく変更される場合があるため、公式ドキュメントを随時参照

---

## 実データ取得例

### TitleLookup（TID=7328）

#### 呼び出し例
```bash
curl "http://cal.syoboi.jp/db.php?Command=TitleLookup&TID=7328"
```

#### レスポンスサンプル（XML形式・一部抜粋）
```xml
<?xml version="1.0" encoding="UTF-8"?>
<TitleLookupResponse>
  <Result>
    <Code>200</Code>
    <Message></Message>
  </Result>
  <TitleItems>
    <TitleItem id="7328">
      <TID>7328</TID>
      <LastUpdate>2025-04-13 02:46:35</LastUpdate>
      <Title>Aランクパーティを離脱した俺は、元教え子たちと迷宮深部を目指す。</Title>
      <ShortTitle></ShortTitle>
      <TitleYomi>えーらんくぱーてぃをりだつしたおれはもとおしえごたちとめいきゅうしんぶをめざす</TitleYomi>
      <TitleEN></TitleEN>
      <Comment>*リンク...</Comment>
      <Cat>1</Cat>
      <TitleFlag>0</TitleFlag>
      <FirstYear>2025</FirstYear>
      <FirstMonth>1</FirstMonth>
      <FirstEndYear></FirstEndYear>
      <FirstEndMonth></FirstEndMonth>
      <FirstCh>日本テレビ</FirstCh>
      <Keywords></Keywords>
      <UserPoint>160</UserPoint>
      <UserPointRank>327</UserPointRank>
      <SubTitles>*01*クローバー誕生...</SubTitles>
    </TitleItem>
  </TitleItems>
</TitleLookupResponse>
```

### ProgLookup（2025/04/13～2025/04/14の放送予定）

#### 呼び出し例
```bash
curl "http://cal.syoboi.jp/db.php?Command=ProgLookup&Range=20250413_000000-20250414_235959"
```

### レスポンスサンプル（XML形式・一部抜粋）
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ProgLookupResponse>
  <ProgItems>
    <ProgItem id="662213">
      <LastUpdate>2025-03-15 04:32:56</LastUpdate>
      <PID>662213</PID>
      <TID>7328</TID>
      <StTime>2025-04-13 00:00:00</StTime>
      <StOffset>0</StOffset>
      <EdTime>2025-04-13 00:30:00</EdTime>
      <Count>12</Count>
      <SubTitle></SubTitle>
      <ProgComment></ProgComment>
      <Flag>0</Flag>
      <Deleted>0</Deleted>
      <Warn>0</Warn>
      <ChID>71</ChID>
      <Revision>0</Revision>
    </ProgItem>
    <ProgItem id="662539">
      <LastUpdate>2025-03-18 21:19:40</LastUpdate>
      <PID>662539</PID>
      <TID>7420</TID>
      <StTime>2025-04-13 00:00:00</StTime>
      <StOffset>0</StOffset>
      <EdTime>2025-04-13 00:30:00</EdTime>
      <Count>1</Count>
      <SubTitle></SubTitle>
      <ProgComment></ProgComment>
      <Flag>2</Flag>
      <Deleted>0</Deleted>
      <Warn>1</Warn>
      <ChID>19</ChID>
      <Revision>0</Revision>
    </ProgItem>
    <ProgItem id="661887">
      <LastUpdate>2025-03-30 00:33:35</LastUpdate>
      <PID>661887</PID>
      <TID>7412</TID>
      <StTime>2025-04-13 00:30:00</StTime>
      <StOffset>0</StOffset>
      <EdTime>2025-04-13 00:56:00</EdTime>
      <Count>12</Count>
      <SubTitle></SubTitle>
      <ProgComment></ProgComment>
      <Flag>0</Flag>
      <Deleted>0</Deleted>
      <Warn>0</Warn>
      <ChID>71</ChID>
      <Revision>1</Revision>
    </ProgItem>
    <!-- ... 他の番組データ ... -->
  </ProgItems>
  <Result>
    <Code>200</Code>
    <Message></Message>
  </Result>
</ProgLookupResponse>
```

### ChLookup（全放送局）

#### 呼び出し例
```bash
curl "http://cal.syoboi.jp/db.php?Command=ChLookup"
```

#### レスポンスサンプル（XML形式・一部抜粋）
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ChLookupResponse>
  <Result>
    <Code>200</Code>
    <Message></Message>
  </Result>
  <ChItems>
    <ChItem id="1">
      <LastUpdate>2020-10-11 05:58:16</LastUpdate>
      <ChID>1</ChID>
      <ChName>NHK総合</ChName>
      <ChiEPGName>ＮＨＫ総合</ChiEPGName>
      <ChURL>https://www.nhk.or.jp/</ChURL>
      <ChEPGURL>https://www.nhk.jp/timetable/</ChEPGURL>
      <ChComment></ChComment>
      <ChGID>11</ChGID>
      <ChNumber>1</ChNumber>
    </ChItem>
    <ChItem id="3">
      <LastUpdate>2018-10-17 03:29:19</LastUpdate>
      <ChID>3</ChID>
      <ChName>フジテレビ</ChName>
      <ChiEPGName>フジテレビ</ChiEPGName>
      <ChURL>https://www.fujitv.co.jp/index.html</ChURL>
      <ChEPGURL>https://www.fujitv.co.jp/timetable/weekly/index.html</ChEPGURL>
      <ChComment>http://jk.nicovideo.jp/watch/jk8</ChComment>
      <ChGID>1</ChGID>
      <ChNumber>8</ChNumber>
    </ChItem>
    <!-- ... 他の放送局データ ... -->
  </ChItems>
</ChLookupResponse>
```

---

## 参考リンク

- [しょぼいカレンダーAPI公式仕様](https://docs.cal.syoboi.jp/spec/db.php/)
- [しょぼいカレンダー本体](https://cal.syoboi.jp/)
