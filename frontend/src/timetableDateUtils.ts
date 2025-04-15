/**
 * 28時制補正済みDate型（午前4時まで前日扱い）
 * 型安全のため addDays28h など28h系関数の引数・返り値に利用する
 */
export type Date28h = Date & { __brand: 'Date28h' };

/**
 * 28時制（午前4時切り替え）で「今日」の日付（0:00 JST）を返す
 * @param date 生のDate
 * @returns 28時制補正済みDate（0:00 JST, Date28h型）
 */
export function getTodayDate28h(date: Date): Date28h {
  let result = new Date(date);
  if (date.getHours() < 4) {
    result.setDate(result.getDate() - 1);
  }
  result.setHours(0, 0, 0, 0);
  return result as Date28h;
}


/**
 * 28時制補正済みDate（Date28h型）からn日後の「その日0:00 JST」のDate28hを返す
 * @param base28h getTodayDate28hで補正済みのDate28h型のみ許容
 * @param n 加算日数
 * @returns n日後の28時制補正済みDate（Date28h型）
 */
export function addDays28h(base28h: Date28h, n: number): Date28h {
  const next = new Date(base28h);
  next.setDate(base28h.getDate() + n);
  next.setHours(0, 0, 0, 0);
  return next as Date28h;
}


// 2つの日付が28時制で同じ日か判定
export function isSameDay28h(a: Date, b: Date): boolean {
  return getTodayDate28h(a).getTime() === getTodayDate28h(b).getTime();
}

/**
 * 選択日（currentBaseDate28h）から「22:00～翌4:00」のISO文字列範囲を返す
 * 複数日モードではそれぞれの22:00～翌4:00をカバーするように拡張
 */
export function getTimetableDisplayRange(
  mode: 'day' | '3days' | 'week',
  baseDate28h: Date
): { startDateTime: string; endDateTime: string } {
  // 1日目の22:00
  const start = new Date(baseDate28h);
  start.setHours(22, 0, 0, 0);
  // 最終日の翌4:00
  const end = new Date(baseDate28h);
  let days = 1;
  switch (mode) {
    case '3days': days = 3; break;
    case 'week': days = 7; break;
  }
  end.setDate(end.getDate() + days);
  end.setHours(4, 0, 0, 0);
  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString()
  };
}

/**
 * viewModeとcurrentBaseDate28hに基づいてstartDateとendDateを計算する関数
 * 28時制の基準日（0:00 JST）から、1日分は0:00〜翌4:00とする
 * 28時制での範囲計算
 */
export function calculateDateRange28h(
  mode: 'day' | '3days' | 'week',
  baseDate28h: Date
): { startDate: string; endDate: string } {
  const start = new Date(baseDate28h); // 0:00 JST
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  switch (mode) {
    case 'day':
      end.setDate(start.getDate() + 1);
      end.setHours(4, 0, 0, 0); // 翌4:00
      break;
    case '3days':
      end.setDate(start.getDate() + 3);
      end.setHours(4, 0, 0, 0);
      break;
    case 'week':
      end.setDate(start.getDate() + 7);
      end.setHours(4, 0, 0, 0);
      break;
  }
  // サーバーAPIがYYYY-MM-DD形式しか受け付けないため、日付部分のみ返す
  const formatDate28h = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: formatDate28h(start), endDate: formatDate28h(end) };
}


