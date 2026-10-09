// nors. points: 1 point for every Rs. 10 spent, credited when an order is delivered.
export const RUPEES_PER_POINT = 10;

// Store-credit value of one point, in rupees. Leave null until the redemption
// rules are announced: while null, the storefront never states a rupee value.
export const POINT_VALUE_PKR: number | null = null;

export function pointsFor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount / RUPEES_PER_POINT);
}

export function pointsLabel(amount: number, scope: string): string | null {
  const pts = pointsFor(amount);
  if (pts <= 0) return null;
  const rate = `Earn 1 nors. point for every Rs. ${RUPEES_PER_POINT} spent`;
  const count = pts.toLocaleString('en-PK');
  if (POINT_VALUE_PKR === null) return `${rate} (${count} on ${scope})`;
  const credit = Math.round(pts * POINT_VALUE_PKR).toLocaleString('en-PK');
  return `${rate} (${count} on ${scope}, worth Rs. ${credit} store credit)`;
}
