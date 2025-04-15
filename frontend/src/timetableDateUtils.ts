// 28時制（午前4時切り替え）で"今日"の日付を返す関数
// テストしやすいよう、基準時刻を引数で受け取る
export function getTimetableTodayDate(baseDate: Date): Date {
  // 4時未満なら前日0時(JST)、それ以外は当日0時(JST)
  let result = new Date(baseDate);
  if (baseDate.getHours() < 4) {
    result.setDate(result.getDate() - 1);
  }
  result.setHours(0, 0, 0, 0);
  return result;
}

// 28時制でn日後の「その日0:00 JST」を返す
export function addTimetableDays(baseDate: Date, n: number): Date {
  const base = getTimetableTodayDate(baseDate);
  const next = new Date(base);
  next.setDate(base.getDate() + n);
  return next;
}

// 2つの日付が28時制で同じ日か判定
export function isSameTimetableDay(a: Date, b: Date): boolean {
  return getTimetableTodayDate(a).getTime() === getTimetableTodayDate(b).getTime();
}


