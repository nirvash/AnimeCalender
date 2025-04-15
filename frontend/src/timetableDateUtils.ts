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


