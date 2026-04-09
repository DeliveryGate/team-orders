/**
 * orderHelpers.js
 * Shared utilities for weekly order calculations and formatting.
 */

export function calcOrderTotals(dayOrders, pricePerTray) {
  const orders = typeof dayOrders === "string" ? JSON.parse(dayOrders) : dayOrders;
  let totalTrays = 0;
  for (const qty of Object.values(orders)) {
    totalTrays += parseInt(qty) || 0;
  }
  const totalPrice = totalTrays * pricePerTray;
  return { totalTrays, totalPrice };
}

export function applyVolumeDiscount(totalTrays, totalPrice, discounts) {
  // discounts: [{minQty, discountPercent, message}] sorted by minQty desc
  const sorted = [...discounts].sort((a, b) => b.minQty - a.minQty);
  for (const tier of sorted) {
    if (totalTrays >= tier.minQty) {
      const discounted = totalPrice * (1 - tier.discountPercent / 100);
      return { discountedPrice: discounted, appliedDiscount: tier };
    }
  }
  return { discountedPrice: totalPrice, appliedDiscount: null };
}

export function getNextMonday(advanceNoticeDays = 1) {
  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + advanceNoticeDays);
  // Find next Monday on or after target
  const day = target.getDay(); // 0=Sun,1=Mon,...6=Sat
  const daysUntilMon = day === 1 ? 0 : (8 - day) % 7 || 7;
  target.setDate(target.getDate() + daysUntilMon);
  return target.toISOString().split("T")[0];
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
