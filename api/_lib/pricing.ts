/**
 * Single source of truth for the service fee. The frontend fetches this via
 * GET /api/pricing-config instead of hardcoding it, so the amount shown to the
 * buyer, the amount charged by Doku, and orders.amount can never drift apart.
 */
export const SERVICE_FEE: number = (() => {
  const parsed = parseInt(process.env.SERVICE_FEE ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2500;
})();

/** Total charged for an item: item price + service fee. */
export function computeGrandTotal(itemPrice: number): number {
  return itemPrice + SERVICE_FEE;
}
