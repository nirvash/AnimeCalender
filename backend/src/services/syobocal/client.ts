import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export class SyobocalClient {
  private baseUrl = 'http://cal.syoboi.jp/db.php';

  /**
   * 番組タイトル情報を取得
   */
  async getTitles(tid?: number) {
    const params = {
      Command: 'TitleLookup',
      ...(tid && { TID: tid }),
    };
    const response = await this.request(params);
    // TitleItemsが存在しない、または空の場合は空配列を返す
    return response?.TitleLookupResponse?.TitleItems?.[0]?.TitleItem || [];
  }

  /**
   * 放送予定・エピソード情報を取得
   */
  async getPrograms(range: string) {
    const params = {
      Command: 'ProgLookup',
      Range: range,
    };
    const response = await this.request(params);
    // ProgItemsが存在しない、または空の場合は空配列を返す
    return response?.ProgLookupResponse?.ProgItems?.[0]?.ProgItem || [];
  }

  /**
   * 放送局情報を取得
   */
  async getChannels() {
    const params = {
      Command: 'ChLookup',
    };
    const response = await this.request(params);
    // ChItemsが存在しない、または空の場合は空配列を返す
    return response?.ChLookupResponse?.ChItems?.[0]?.ChItem || [];
  }

  /**
   * APIリクエストを実行しXMLをパース
   */
  private async request(params: Record<string, any>) {
    try {
      const response = await axios.get(this.baseUrl, { params });
      const result = await parseStringPromise(response.data);
      return result;
    } catch (error) {
      console.error('Syobocal API error:', error);
      throw error;
    }
  }
}