import { isToday } from '../src/isToday';

// Fixed "now": 30 Sep 2026, 12:00 noon in the device's local time zone
const NOW = new Date(2026, 8, 30, 12, 0, 0);

// Builds a Salesforce-style DateTime string (UTC, "+0000") from a local Date
const toSalesforceDateTime = (d: Date) =>
  d.toISOString().replace('Z', '+0000');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('isToday - Date field (YYYY-MM-DD)', () => {
  it('returns true for today', () => {
    expect(isToday('2026-09-30')).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isToday('2026-09-29')).toBe(false);
  });

  it('returns false for tomorrow', () => {
    expect(isToday('2026-10-01')).toBe(false);
  });

  it('returns false for same day and month in a different year', () => {
    expect(isToday('2025-09-30')).toBe(false);
  });
});

describe('isToday - DateTime field (YYYY-MM-DDThh:mm:ss.SSS+0000)', () => {
  it('returns true for the current moment', () => {
    expect(isToday(toSalesforceDateTime(NOW))).toBe(true);
  });

  it('returns true for the start of today (local 00:00:00)', () => {
    const startOfToday = new Date(2026, 8, 30, 0, 0, 0);
    expect(isToday(toSalesforceDateTime(startOfToday))).toBe(true);
  });

  it('returns true for the end of today (local 23:59:59)', () => {
    const endOfToday = new Date(2026, 8, 30, 23, 59, 59);
    expect(isToday(toSalesforceDateTime(endOfToday))).toBe(true);
  });

  it('returns false for the last second of yesterday (local 23:59:59)', () => {
    const yesterdayEnd = new Date(2026, 8, 29, 23, 59, 59);
    expect(isToday(toSalesforceDateTime(yesterdayEnd))).toBe(false);
  });

  it('returns false for the first second of tomorrow (local 00:00:00)', () => {
    const tomorrowStart = new Date(2026, 9, 1, 0, 0, 0);
    expect(isToday(toSalesforceDateTime(tomorrowStart))).toBe(false);
  });

  it('parses the "+0000" offset format without failing', () => {
    expect(isToday('2020-01-01T10:00:00.000+0000')).toBe(false);
  });

  it('also accepts the "Z" format', () => {
    expect(isToday(NOW.toISOString())).toBe(true);
  });

  it('also accepts the "+00:00" format', () => {
    expect(isToday(NOW.toISOString().replace('Z', '+00:00'))).toBe(true);
  });

  it('ignores surrounding whitespace on a DateTime', () => {
    expect(isToday(`  ${toSalesforceDateTime(NOW)} `)).toBe(true);
  });

  it('ignores surrounding whitespace on a Date', () => {
    expect(isToday(' 2026-09-30 ')).toBe(true);
  });
});

describe('isToday - invalid input', () => {
  it('returns false for null', () => {
    expect(isToday(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isToday(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isToday('')).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(isToday('garbage')).toBe(false);
  });

  it('returns false for a malformed DateTime', () => {
    expect(isToday('2026-13-45T99:99:99.000+0000')).toBe(false);
  });
});