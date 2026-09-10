const HOUR_MINUTES = 60;
const DAY_MINUTES = 24 * HOUR_MINUTES;

const UNIT_TO_MINUTES: Record<string, number> = {
  minutes: 1,
  minute: 1,
  mins: 1,
  min: 1,
  m: 1,
  hours: HOUR_MINUTES,
  hour: HOUR_MINUTES,
  hrs: HOUR_MINUTES,
  hr: HOUR_MINUTES,
  h: HOUR_MINUTES,
  days: DAY_MINUTES,
  day: DAY_MINUTES,
  d: DAY_MINUTES,
  weeks: 7 * DAY_MINUTES,
  week: 7 * DAY_MINUTES,
  wks: 7 * DAY_MINUTES,
  wk: 7 * DAY_MINUTES,
  w: 7 * DAY_MINUTES,
};

const DURATION_TOKEN_RE =
  /(\d+(?:\.\d+)?)\s*(minutes|minute|mins|min|m|hours|hour|hrs|hr|h|days|day|d|weeks?|wks?|wk|w)/gi;

// Captures "5pm", "10am", "14:30", "2:30pm", "12:00"
const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;

/**
 * Parses a date/time shortcut and returns the target Date, or null if unrecognised.
 *
 * Supported formats:
 *   tomorrow / tmrw           -> tomorrow 9:00 AM
 *   tomorrow 5pm               -> tomorrow 5:00 PM
 *   nextweek                  -> next Monday 9:00 AM
 *   nextweek 10am             -> next Monday 10:00 AM
 *   nextmonth                 -> +30 days 9:00 AM
 *   7days / 7d               -> +7 days 9:00 AM
 *   29d                       -> +29 days 9:00 AM
 */
export function parseDateShortcut(input: string): Date | null {
  const trimmed = input.trim();

  // Split off optional time suffix (e.g. "tomorrow 5pm" -> ["tomorrow", "5pm"])
  const spaceIdx = trimmed.search(/\s/);
  const datePart = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const timePart = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
  const lower = datePart.toLowerCase();

  // Parse time if provided, defaulting to 9:00 AM
  const { hour, minute } = parseTime(timePart);

  // Keyword shortcuts
  if (lower === 'tomorrow' || lower === 'tmrw') {
    return upcomingTime(1, hour, minute);
  }

  if (lower === 'nextweek') {
    return upcomingWeekday(1, hour, minute);
  }

  if (lower === 'nextmonth') {
    return daysFromNow(30, hour, minute);
  }

  // Digit-based shortcuts: "7days", "7d", "29d"
  const daysMatch = datePart.match(/^(\d+)d(?:ays?)?$/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    return daysFromNow(days, hour, minute);
  }

  // No recognised date shortcut
  return null;
}

/** Parses a time string like "5pm", "10am", "14:30", "2:30pm". */
function parseTime(raw: string): { hour: number; minute: number } {
  if (!raw) return { hour: 9, minute: 0 };

  const match = raw.match(TIME_RE);
  if (!match) return { hour: 9, minute: 0 };

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = (match[3] ?? '').toLowerCase();

  if (meridiem === 'am') {
    hour = hour === 12 ? 0 : hour;
  } else if (meridiem === 'pm') {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return { hour: Math.min(23, hour), minute: Math.min(59, minute) };
}

/**
 * Returns the date of the next occurrence of targetWeekday (0=Sun, 1=Mon…)
 * at the given hour and minute.
 */
function upcomingWeekday(targetWeekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntil = (targetWeekday - today.getDay() + 7) % 7;
  const daysToAdd = daysUntil === 0 ? 7 : daysUntil;
  const d = new Date(today.getTime() + daysToAdd * DAY_MINUTES * 60_000);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Returns a date N days from now at the given hour and minute.
 */
function daysFromNow(days: number, hour: number, minute: number): Date {
  const d = new Date(Date.now() + days * DAY_MINUTES * 60_000);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Returns a date N days from now at the given hour and minute.
 * If that time is in the past, shifts to the same time the following day.
 */
function upcomingTime(daysFromToday: number, hour: number, minute: number): Date {
  const d = daysFromNow(daysFromToday, hour, minute);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * "30 min"  -> 30
 * "1 hour"  -> 60
 * "2 hours" -> 120
 * "1h 30m"  -> 90
 * "1.5 h"   -> 90
 * "1 day"   -> 1440
 * "garbage" -> null
 * ""        -> null
 */
export function parseDurationToMinutes(input: string): number | null {
  if (!input || !input.trim()) return null;

  let total = 0;
  let match: RegExpExecArray | null;

  DURATION_TOKEN_RE.lastIndex = 0;
  while ((match = DURATION_TOKEN_RE.exec(input)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const multiplier = UNIT_TO_MINUTES[unit];
    if (multiplier === undefined) return null;
    total += value * multiplier;
  }

  return total > 0 ? total : null;
}

/**
 * 90  -> "1h 30m"
 * 45  -> "45m"
 * 60  -> "1h"
 * 0   -> ""
 * undefined -> ""
 */
export function formatMinutesAsDuration(minutes?: number): string {
  if (minutes === undefined || minutes <= 0) return '';

  const days = Math.floor(minutes / DAY_MINUTES);
  const remainder = minutes % DAY_MINUTES;
  const hours = Math.floor(remainder / HOUR_MINUTES);
  const mins = remainder % HOUR_MINUTES;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.join(' ');
}
