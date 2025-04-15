import { getTodayDate28h } from '../timetableDateUtils';

describe('getTodayDate28h', () => {
  // JST基準
  const JST_OFFSET = 9 * 60 * 60 * 1000;

  function getJSTDate(date: Date): number {
    const jst = new Date(date.getTime() + JST_OFFSET);
    return jst.getDate();
  }

  it('JST 2025-04-15 03:59:59 → 2025-04-14', () => {
    const base = new Date('2025-04-15T03:59:59+09:00'); // JST=2025-04-15 03:59:59
    const result = getTodayDate28h(base);
    expect(getJSTDate(result)).toBe(14);
  });

  it('JST 2025-04-15 04:00:00 → 2025-04-15', () => {
    const base = new Date('2025-04-15T04:00:00+09:00'); // JST=2025-04-15 04:00:00
    const result = getTodayDate28h(base);
    expect(getJSTDate(result)).toBe(15);
  });

  it('JST 2025-04-15 15:00:00 → 2025-04-15', () => {
    const base = new Date('2025-04-15T15:00:00+09:00'); // JST=2025-04-15 15:00:00
    const result = getTodayDate28h(base);
    expect(getJSTDate(result)).toBe(15);
  });

  it('JST 2025-04-15 00:00:00 → 2025-04-14', () => {
    const base = new Date('2025-04-15T00:00:00+09:00'); // JST=2025-04-15 00:00:00
    const result = getTodayDate28h(base);
    expect(getJSTDate(result)).toBe(14);
  });
});
