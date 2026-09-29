/**
 * Renewal + 47-day readiness calculator: pure date math, client-side.
 *
 * Encodes the CA/Browser Forum SC-081v3 schedule (200 d from 2026-03-15,
 * 100 d from 2027-03-15, 47 d from 2029-03-15) so teams can plan automation
 * before the caps bite. No certificate parsing here: the decoder already
 * does that; this module answers "when must I renew?".
 */

import { diffDays } from "./util";

export const SC081_CAPS = [
  { from: new Date("2029-03-15T00:00:00Z"), maxDays: 47 },
  { from: new Date("2027-03-15T00:00:00Z"), maxDays: 100 },
  { from: new Date("2026-03-15T00:00:00Z"), maxDays: 200 },
] as const;

/** Max public-TLS validity for a certificate issued (or renewed) on `date`. */
export function maxValidityOn(date: Date): number {
  for (const cap of SC081_CAPS) {
    if (date.getTime() >= cap.from.getTime()) return cap.maxDays;
  }
  return 398; // pre-SC-081v3 ceiling still in force until 2026-03-15
}

export interface RenewalPlan {
  notAfter: Date;
  daysLeft: number;
  expired: boolean;
  /** Date by which renewal should be *completed* (renewBeforeDays ahead). */
  renewBy: Date;
  maxValidityNow: number;
  /** Whether a fresh cert issued today with the same lifetime would comply. */
  note47Day: string;
}

export type RenewalOutcome =
  | { ok: true; plan: RenewalPlan }
  | { ok: false; error: string };

export function planRenewal(
  notAfterInput: string | Date,
  opts?: { now?: Date; renewBeforeDays?: number }
): RenewalOutcome {
  const now = opts?.now ?? new Date();
  const renewBeforeDays = opts?.renewBeforeDays ?? 30;

  const notAfter =
    notAfterInput instanceof Date ? notAfterInput : new Date(notAfterInput);
  if (Number.isNaN(notAfter.getTime())) {
    return {
      ok: false,
      error: "Unparseable date. Use ISO-8601 (e.g. 2027-02-01) or paste notAfter from the decoder.",
    };
  }

  const daysLeft = diffDays(notAfter, now);
  const expired = notAfter.getTime() <= now.getTime();
  const renewBy = new Date(notAfter.getTime() - renewBeforeDays * 86_400_000);
  const maxValidityNow = maxValidityOn(now);
  const lifetimeIfIssuedToday = diffDays(notAfter, now);

  const note47Day =
    lifetimeIfIssuedToday > maxValidityNow
      ? `A certificate valid until this date issued today would exceed the current ${maxValidityNow}-day cap: plan automation now.`
      : `Within the current ${maxValidityNow}-day cap (SC-081v3 schedule: 200 d → 2026-03-15, 100 d → 2027-03-15, 47 d → 2029-03-15).`;

  return {
    ok: true,
    plan: { notAfter, daysLeft, expired, renewBy, maxValidityNow, note47Day },
  };
}
