import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// APIレスポンスの型定義
interface SyobocalProgram {
  TID: string[];
  PID: string[];
  StTime: string[];
  EdTime: string[];
  Count: string[];
  SubTitle: string[];
  ProgComment: string[];
  Flag: string[];
  Deleted: string[];
  Warn: string[];
  ChID: string[];
  Revision: string[];
  LastUpdate: string[];
}

interface SyobocalTitle {
  TID: string[];
  Title: string[];
  ShortTitle: string[];
  TitleYomi: string[];
  Comment: string[];
  Cat: string[];
  TitleFlag: string[];
  LastUpdate: string[];
}

export class SyobocalClient {
  private baseUrl = 'http://cal.syoboi.jp/db.php';

  /**
   * 番組タイトル情報を取得
   */
  async getTitles(tid?: number | string) {
    const params: Record<string, any> = {
      Command: 'TitleLookup',
    };

    if (!tid) {
      // 放送予定のある番組のIDを取得
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14); // 2週間分の放送予定を取得
      
      const range = `${this.formatDate(start)}-${this.formatDate(end)}`;
      const programs = await this.getPrograms(range);
      
      // 放送予定のある番組のTIDを抽出（重複を除去）
      const tids = [...new Set(programs.map((prog: SyobocalProgram) => prog.TID[0]))];
      if (tids.length > 0) {
        params.TID = tids.join(',');
      }
    } else {
      params.TID = tid;
    }
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
 * 日付をYYYYMMDD_HHMMSS形式に変換
 */
private formatDate(date: Date): string {
  return date.toISOString()
    .slice(0, 19)                // YYYY-MM-DDTHH:mm:ss
    .replace(/[-:T]/g, '')       // YYYYMMDDHHmmss
    .replace(/(\d{8})(\d{6})/, '$1_$2'); // YYYYMMDD_HHMMSS
}

  /**
   * APIリクエストを実行しXMLをパース
   */
  private async request(params: Record<string, any>) {
    try {
      console.log('🌐 Requesting Syobocal API:', {
        url: this.baseUrl,
        params: params
      });
      const response = await axios.get(this.baseUrl, { params });
      const result = await parseStringPromise(response.data);
      this.checkApiError(result);
      return result;
    } catch (error) {
      console.error('Syobocal API error:', error);
      throw error;
    }
  }

  /**
   * APIのエラーレスポンスをチェック
   */
  private checkApiError(result: any) {
    const code =
      result?.TitleLookupResponse?.Result?.[0]?.Code?.[0] ||
      result?.ProgLookupResponse?.Result?.[0]?.Code?.[0] ||
      result?.ChLookupResponse?.Result?.[0]?.Code?.[0];
    
    const message =
      result?.TitleLookupResponse?.Result?.[0]?.Message?.[0] ||
      result?.ProgLookupResponse?.Result?.[0]?.Message?.[0] ||
      result?.ChLookupResponse?.Result?.[0]?.Message?.[0] ||
      'Unknown error';

    if (code !== '200') {
      throw new Error(`API returned error (${code}): ${message}`);
    }
  }
}