import { addTimetableDays, isSameTimetableDay } from '../timetableDateUtils';

describe('addTimetableDays 境界条件', () => {
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  function getJSTDate(date: Date): string {
    // YYYY-MM-DD形式
    const jst = new Date(date.getTime() + JST_OFFSET);
    return jst.toISOString().slice(0, 10);
  }

  const cases = [
    // [説明, 入力, 期待される日付（n=0, n=1, n=-1）]
    ['4:00:00ちょうど', '2025-04-15T04:00:00+09:00', ['2025-04-15', '2025-04-16', '2025-04-14']],
    ['4:00:01直後', '2025-04-15T04:00:01+09:00', ['2025-04-15', '2025-04-16', '2025-04-14']],
    ['3:59:59直前', '2025-04-15T03:59:59+09:00', ['2025-04-14', '2025-04-15', '2025-04-13']],
    ['0:00:00', '2025-04-15T00:00:00+09:00', ['2025-04-14', '2025-04-15', '2025-04-13']],
    ['23:59:59', '2025-04-15T23:59:59+09:00', ['2025-04-15', '2025-04-16', '2025-04-14']],
    ['4:00:00直前日', '2025-04-14T04:00:00+09:00', ['2025-04-14', '2025-04-15', '2025-04-13']],
  ] as const;

  it.each(cases)('%s n=0, n=1, n=-1', (_desc, input: string, expected: readonly string[]) => {
    const base = new Date(input);
    expect(getJSTDate(addTimetableDays(base, 0))).toBe(expected[0]);
    expect(getJSTDate(addTimetableDays(base, 1))).toBe(expected[1]);
    expect(getJSTDate(addTimetableDays(base, -1))).toBe(expected[2]);
  });
});

describe('isSameTimetableDay 境界条件', () => {
  it('3:59:59と4:00:00は異なる日', () => {
    const d1 = new Date('2025-04-15T03:59:59+09:00');
    const d2 = new Date('2025-04-15T04:00:00+09:00');
    expect(isSameTimetableDay(d1, d2)).toBe(false);
  });
  it('4:00:00と23:59:59は同じ日', () => {
    const d1 = new Date('2025-04-15T04:00:00+09:00');
    const d2 = new Date('2025-04-15T23:59:59+09:00');
    expect(isSameTimetableDay(d1, d2)).toBe(true);
  });
  it('0:00:00と3:59:59は同じ日', () => {
    const d1 = new Date('2025-04-15T00:00:00+09:00');
    const d2 = new Date('2025-04-15T03:59:59+09:00');
    expect(isSameTimetableDay(d1, d2)).toBe(true);
  });
  it('23:59:59と翌日0:00:00は同じ日', () => {
    const d1 = new Date('2025-04-15T23:59:59+09:00');
    const d2 = new Date('2025-04-16T00:00:00+09:00');
    expect(isSameTimetableDay(d1, d2)).toBe(true);
  });
});
