import { parseDurationToMinutes } from './duration';

// ── Regex building blocks ───────────────────────────────────────────────────

const MONTH =
  String.raw`jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?`;

const WEEKDAY =
  String.raw`mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?`;

// ── Time parsing ────────────────────────────────────────────────────────────

const TIME_RE =
  /^(\d{1,2})(?:[:.](\d{1,2}))?\s*(am|pm)?$/i;

/** Parse "10am", "1:30pm", "1.30pm", "13:30", "10.12" → { hour, minute } or null. */
function parseTime(raw: string): { hour: number; minute: number } | null {
  const match = raw.trim().match(TIME_RE);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = (match[3] ?? '').toLowerCase();

  if (meridiem === 'am') hour = hour === 12 ? 0 : hour;
  else if (meridiem === 'pm') hour = hour === 12 ? 12 : hour + 12;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Extract a trailing time from a string like "tomorrow 10pm", "25 sep at 14:30".
 * Returns null if no time is found.
 */
function extractTrailingTime(input: string): { hour: number; minute: number } | null {
  // Strip optional "at " prefix, then match the time pattern at the end
  const m = input.match(
    /(?:\s+at\s+)?(\d{1,2}(?:[:.]\d{1,2})?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}\.\d{2})$/i,
  );
  return m ? parseTime(m[1]) : null;
}

// ── Timezone-aware date helpers ─────────────────────────────────────────────
//
// All wall-clock dates are resolved in REMINDER_TIMEZONE (the bot's timezone,
// also used for the confirmation message in the router). Previously the parser
// used the server's local timezone (usually UTC) while the confirmation
// rendered in IST — a 5h30m discrepancy ("6pm" → stored 18:00 UTC → shown 11:30pm IST).

export const REMINDER_TIMEZONE = 'Asia/Kolkata';

const DEFAULT_HOUR = 9;

type Wall = { y: number; mo: number; d: number; h: number; mi: number };

let offsetMsCache: number | null = null;

/** Fixed UTC offset of REMINDER_TIMEZONE in ms (wall time − UTC time). */
function tzOffsetMs(): number {
  if (offsetMsCache === null) {
    const w = wallParts(new Date());
    offsetMsCache = Date.UTC(w.y, w.mo, w.d, w.h, w.mi) - Date.now();
  }
  return offsetMsCache;
}

/** Wall-clock components of `date` in REMINDER_TIMEZONE. */
function wallParts(date: Date): Wall {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: REMINDER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(date)) {
    if (type !== 'literal') p[type] = value;
  }
  let h = parseInt(p.hour, 10);
  if (h === 24) h = 0; // hour12:false can report midnight as "24"
  return {
    y: parseInt(p.year, 10),
    mo: parseInt(p.month, 10) - 1,
    d: parseInt(p.day, 10),
    h,
    mi: parseInt(p.minute, 10),
  };
}

/** Builds the instant representing wall-clock (w.y, w.mo, w.d, h, mi) in REMINDER_TIMEZONE. */
function fromWall(w: Wall, h = w.h, mi = w.mi): Date {
  return new Date(Date.UTC(w.y, w.mo, w.d, h, mi) - tzOffsetMs());
}

/** Wall-clock components of "now" in REMINDER_TIMEZONE. */
function nowWall(): Wall {
  return wallParts(new Date());
}

/** The date `w` at the given time, defaulting to 9am. */
function atDefault(w: Wall, time: { hour: number; minute: number } | null): Date {
  return fromWall(w, time?.hour ?? DEFAULT_HOUR, time?.minute ?? 0);
}

/** Adds `days` to a wall-clock tuple, preserving the time-of-day. */
function addDays(w: Wall, days: number): Wall {
  const u = new Date(Date.UTC(w.y, w.mo, w.d + days));
  return { y: u.getUTCFullYear(), mo: u.getUTCMonth(), d: u.getUTCDate(), h: w.h, mi: w.mi };
}

/** Adds `months` to a wall-clock tuple, clamping to the month-end if the day overflows. */
function addMonths(w: Wall, months: number): Wall {
  const first = new Date(Date.UTC(w.y, w.mo + months, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return {
    y: first.getUTCFullYear(),
    mo: first.getUTCMonth(),
    d: Math.min(w.d, lastDay),
    h: w.h,
    mi: w.mi,
  };
}

/** Day of week (0=Sun … 6=Sat) of a wall-clock tuple. */
function weekday(w: Wall): number {
  return new Date(Date.UTC(w.y, w.mo, w.d)).getUTCDay();
}

/** The Date at `w`'s time-of-day, or one day later if it has already passed. */
function shiftIfPast(date: Date): Date {
  if (date.getTime() <= Date.now()) {
    return fromWall(addDays(wallParts(date), 1));
  }
  return date;
}

// ── Weekday / month name parsing ────────────────────────────────────────────

function parseWeekdayIndex(name: string): number {
  const c = name.toLowerCase()[0];
  // s=Sun(0) m=Mon(1) t=Tue(2) w=Wed(3) t=Thu(4) f=Fri(5) s=Sat(6)
  if (c === 's') return name.toLowerCase().startsWith('sun') ? 0 : 6;
  if (c === 'm') return 1;
  if (c === 'w') return 3;
  if (c === 'f') return 5;
  if (c === 't') return name.toLowerCase().startsWith('tu') ? 2 : 4;
  return -1;
}

function parseMonthIndex(name: string): number {
  const map: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const key = name.toLowerCase().slice(0, 3);
  return key in map ? map[key] : -1;
}

function parseYear(str: string): number {
  const n = parseInt(str, 10);
  return n < 100 ? 2000 + n : n;
}

// ── Parsers (tried in order) ────────────────────────────────────────────────

const DURATION_RE =
  /^(?:in\s+)?(\d+(?:\.\d+)?)\s*(minutes|minute|mins|min|m|hours|hour|hrs|hr|h|days|day|d|weeks?|wks?|wk|w)\b/i;

function tryRelativeDuration(input: string): Date | null {
  const m = input.match(DURATION_RE);
  if (!m) return null;

  const minutes = parseDurationToMinutes(`${m[1]} ${m[2]}`);
  if (!minutes) return null;
  return new Date(Date.now() + minutes * 60_000);
}

const KEYWORD_RE = /^(today|tonight|tomorrow|tmrw)\b/i;

function tryKeyword(input: string): Date | null {
  const m = input.match(KEYWORD_RE);
  if (!m) return null;

  const kw = m[1].toLowerCase();
  const time = extractTrailingTime(input);

  if (kw === 'today') return shiftIfPast(atDefault(nowWall(), time));
  if (kw === 'tonight') return shiftIfPast(atDefault(nowWall(), time ?? { hour: 21, minute: 0 }));
  // tomorrow / tmrw
  return atDefault(addDays(nowWall(), 1), time);
}

const NEXT_RELATIVE_RE = /^next\s+(day|week|month|year)\b/i;

function tryNextRelative(input: string): Date | null {
  const m = input.match(NEXT_RELATIVE_RE);
  if (!m) return null;

  const unit = m[1].toLowerCase();
  const time = extractTrailingTime(input);
  const w = nowWall();

  if (unit === 'day') {
    return atDefault(addDays(w, 1), time);
  }
  if (unit === 'week') {
    // Next Monday
    const daysToMon = (8 - weekday(w)) % 7 || 7;
    return atDefault(addDays(w, daysToMon), time);
  }
  if (unit === 'month') {
    return atDefault(addMonths(w, 1), time);
  }
  // year
  return atDefault(addMonths(w, 12), time);
}

const WEEKDAY_RE = /^(?:(this|next)\s+)?(mon|tue|wed|thu|fri|sat|sun)\w*\b/i;

function tryWeekday(input: string): Date | null {
  const m = input.match(WEEKDAY_RE);
  if (!m) return null;

  const prefix = m[1]?.toLowerCase();
  const dayIndex = parseWeekdayIndex(m[2]);
  if (dayIndex === -1) return null;

  const time = extractTrailingTime(input);
  const w = nowWall();
  const todayIndex = weekday(w);
  let daysUntil = (dayIndex - todayIndex + 7) % 7;

  if (prefix === 'this') {
    // This week's occurrence; if already past (same day + time passed), next week
    if (daysUntil === 0 && atDefault(w, time).getTime() <= Date.now()) {
      daysUntil = 7;
    }
  } else if (daysUntil === 0) {
    // Bare weekday or "next" — always next occurrence, never today
    daysUntil = 7;
  }

  return atDefault(addDays(w, daysUntil), time);
}

const NAMED_DATE_RE =
  /^(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{2,4}))?\b/i;

function tryNamedDate(input: string): Date | null {
  const m = input.match(NAMED_DATE_RE);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const month = parseMonthIndex(m[2]);
  if (month === -1 || day < 1 || day > 31) return null;

  const time = extractTrailingTime(input);
  const currentYear = nowWall().y;
  const year = m[3] ? parseYear(m[3]) : currentYear;
  const base = { y: year, mo: month, d: day, h: 0, mi: 0 };

  let date = atDefault(base, time);
  // If no year was given and the date is in the past, bump to next year
  if (!m[3] && date.getTime() <= Date.now()) {
    date = atDefault({ ...base, y: year + 1 }, time);
  }

  return date;
}

// Numeric: 25/09, 25/09/2026, 25-09, 25-09-2026, 2026-09-25
// No $ anchor — trailing time is stripped before matching.
const NUMERIC_DMY_RE = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/;
const NUMERIC_YMD_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})/;

function tryNumericDate(input: string): Date | null {
  const time = extractTrailingTime(input);
  const currentYear = nowWall().y;

  // Strip trailing time (if any) to get just the date part
  let dateStr = input;
  if (time) {
    dateStr = input
      .replace(/(?:\s+at\s+)?(?:\d{1,2}(?:[:.]\d{1,2})?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}\.\d{2})$/i, '')
      .trim();
  }

  // YMD: 2026-09-25
  const ymd = dateStr.match(NUMERIC_YMD_RE);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return atDefault({ y: year, mo: month, d: day, h: 0, mi: 0 }, time);
  }

  // DMY: 25/09, 25/09/2026
  const dmy = dateStr.match(NUMERIC_DMY_RE);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const year = dmy[3] ? parseYear(dmy[3]) : currentYear;
    const base = { y: year, mo: month, d: day, h: 0, mi: 0 };
    let date = atDefault(base, time);
    if (!dmy[3] && date.getTime() <= Date.now()) {
      date = atDefault({ ...base, y: year + 1 }, time);
    }
    return date;
  }

  return null;
}

// Bare time: 10am, 1:30pm, 13:30, 10.12
const BARE_TIME_RE =
  /^(\d{1,2})(?:[:.](\d{1,2}))?\s*(am|pm)$|^(\d{1,2}):(\d{2})$|^(\d{1,2})\.(\d{2})$/i;

function tryBareTime(input: string): Date | null {
  const time = parseTime(input);
  if (!time) return null;
  return shiftIfPast(atDefault(nowWall(), time));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a natural-language datetime string into a Date, or null if unrecognised.
 *
 * Tries each strategy in order:
 *   1. Relative duration  ("in 30 min", "7d", "2w")
 *   2. Keyword            ("today", "tonight", "tomorrow", "tmrw")
 *   3. Next-relative      ("next day", "next week", "next month", "next year")
 *   4. Weekday            ("monday", "this friday", "next monday")
 *   5. Named date         ("25 sep", "25 sep 2026")
 *   6. Numeric date       ("25/09", "25/09/2026", "2026-09-25")
 *   7. Bare time          ("10am", "13:30", "10.12")
 */
export function parseWhen(input: string): Date | null {
  const trimmed = input.trim();
  return (
    tryRelativeDuration(trimmed) ??
    tryKeyword(trimmed) ??
    tryNextRelative(trimmed) ??
    tryWeekday(trimmed) ??
    tryNamedDate(trimmed) ??
    tryNumericDate(trimmed) ??
    tryBareTime(trimmed)
  );
}

/**
 * The full WHEN regex — matches a natural-language datetime at the start
 * of a string.  Group 1 is the datetime, Group 2 is the trailing text.
 *
 * Built from the user-provided regex components.
 */
const WHEN_PATTERN = String.raw`(?:` +
  // date/duration/weekday + optional time
  String.raw`(?:(?:in\s+)?(?:\d+\s*(?:m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)|(?:today|tomorrow|tonight|next\s+(?:day|week|month|year))|(?:this\s+|next\s+)?(?:${WEEKDAY})|(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})|(?:\d{1,2}\s+(?:${MONTH})(?:\s+\d{2,4})?))\s+(?:at\s+)?(?:\d{1,2}(?:[:.]\d{1,2})?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}\.\d{2}))` +
  `|` +
  // bare relative
  String.raw`(?:(?:in\s+)?(?:\d+\s*(?:m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks))|(?:today|tomorrow|tonight|next\s+(?:day|week|month|year)))` +
  `|` +
  // bare weekday
  String.raw`(?:(?:this\s+|next\s+)?(?:${WEEKDAY}))` +
  `|` +
  // bare date (named or numeric)
  String.raw`(?:(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})|(?:\d{1,2}\s+(?:${MONTH})(?:\s+\d{2,4})?))` +
  `|` +
  // bare time
  String.raw`(?:\d{1,2}(?:[:.]\d{1,2})?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}\.\d{2})` +
`)`;

export const remindRegex = new RegExp(
  String.raw`^/remind\s+(${WHEN_PATTERN})\s+(.+)$`,
  'i',
);
