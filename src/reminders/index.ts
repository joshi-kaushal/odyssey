import pino from 'pino';
import { Reminder } from '../types/reminder';

const logger = pino({ level: 'info' });

const SWEEP_INTERVAL_MS = 30_000;

const store = new Map<string, Reminder>();

let sendMessage: ((to: string, text: string) => Promise<void>) | null = null;

export function setReminderSendFn(
  fn: (to: string, text: string) => Promise<void>
): void {
  sendMessage = fn;
}

export function addReminder(jobId: string, reminder: Reminder): void {
  store.set(jobId, reminder);
}

export function hasReminder(jobId: string): boolean {
  return store.has(jobId);
}

/**
 * Runs the sweep synchronously so callers can await it in tests.
 * Returns the reminders that fired.
 */
export function runSweep(): Reminder[] {
  const now = Date.now();
  const fired: Reminder[] = [];

  for (const [jobId, reminder] of store) {
    if (reminder.at <= now) {
      fired.push(reminder);
      store.delete(jobId);
    }
  }

  for (const reminder of fired) {
    if (sendMessage) {
      sendMessage(reminder.to, `Reminder: ${reminder.text}`).catch((err) =>
        logger.error({ err }, 'Failed to send reminder message')
      );
    }
  }

  return fired;
}

// Start background sweep — loss on restart is acceptable for one-off reminders.
setInterval(() => runSweep(), SWEEP_INTERVAL_MS);
