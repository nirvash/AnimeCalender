import { getTodayDate28h, addDays28h, isSameDay28h } from '../timetableDateUtils';

describe('addDays28h', () => {
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  function getJSTDate(date: Date): number {
    const jst = new Date(date.getTime() + JST_OFFSET);
    return jst.getDate();
  }

  it('0日後（同日）', () => {
    const base = new Date('2025-04-15T15:00:00+09:00');
    const base28h = getTodayDate28h(base);
    const result = addDays28h(base28h, 0);
    expect(getJSTDate(result)).toBe(15);
  });

  it('1日後', () => {
    const base = new Date('2025-04-15T15:00:00+09:00');
    const base28h = getTodayDate28h(base);
    const result = addDays28h(base28h, 1);
    expect(getJSTDate(result)).toBe(16);
  });

  it('-1日（前日）', () => {
    const base = new Date('2025-04-15T15:00:00+09:00');
    const base28h = getTodayDate28h(base);
    const result = addDays28h(base28h, -1);
    expect(getJSTDate(result)).toBe(14);
  });

  it('4時前をまたぐ場合', () => {
    const base = new Date('2025-04-15T03:00:00+09:00'); // 4時前は前日扱い
    const base28h = getTodayDate28h(base);
    const result = addDays28h(base28h, 1);
    expect(getJSTDate(result)).toBe(15);
  });
});

describe('isSameDay28h', () => {
  it('同じ28時制日付', () => {
    const d1 = new Date('2025-04-15T15:00:00+09:00');
    const d2 = new Date('2025-04-15T23:59:59+09:00');
    expect(isSameDay28h(d1, d2)).toBe(true);
  });

  it('28時制でまたぐ場合（03:00と04:00）', () => {
    const d1 = new Date('2025-04-15T03:00:00+09:00'); // 4時前は前日扱い
    const d2 = new Date('2025-04-15T04:00:00+09:00'); // 当日扱い
    expect(isSameDay28h(d1, d2)).toBe(false);
  });

  it('完全に異なる日付', () => {
    const d1 = new Date('2025-04-15T15:00:00+09:00');
    const d2 = new Date('2025-04-16T15:00:00+09:00');
    expect(isSameDay28h(d1, d2)).toBe(false);
  });
});
