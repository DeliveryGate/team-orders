import express from "express";
import compression from "compression";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";
import { verifyWebhookHmac, shopifyGraphQL, PLANS, CREATE_SUBSCRIPTION } from "./shopify.js";
import { verifyRequest } from "./middleware/verify-request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const IS_PROD = process.env.NODE_ENV === "production";

app.use(compression());
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok", app: "team-orders" }));

// ─── Webhooks (GDPR + uninstall) ────────────────────────────────────────────
app.post("/api/webhooks/:topic", async (req, res) => {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!hmac || !verifyWebhookHmac(req.body.toString(), hmac, process.env.SHOPIFY_API_SECRET)) {
    return res.status(401).send("Unauthorized");
  }
  const shop = req.headers["x-shopify-shop-domain"];
  try {
    const { topic } = req.params;
    if (topic === "app-uninstalled" || topic === "shop-redact") {
      await prisma.weeklyOrder.deleteMany({ where: { shop } });
      await prisma.volumeDiscount.deleteMany({ where: { shop } });
      await prisma.mealSize.deleteMany({ where: { shop } });
      await prisma.merchantPlan.deleteMany({ where: { shop } });
      await prisma.session.deleteMany({ where: { shop } });
    }
    if (topic === "customers-redact" || topic === "customers-data-request") {
      // No PII stored per customer — acknowledge
    }
    res.status(200).send("OK");
  } catch (err) {
    console.error("[webhook] error:", err);
    res.status(500).send("Error");
  }
});

// ─── Config (full page config for storefront extension) ───────────────────────
app.get("/api/config", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const [merchant, mealSizes, discounts] = await Promise.all([
      prisma.merchantPlan.findUnique({ where: { shop } }),
      prisma.mealSize.findMany({ where: { shop, active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.volumeDiscount.findMany({ where: { shop }, orderBy: { minQty: "asc" } }),
    ]);
    res.json({
      plan: merchant?.plan || "free",
      availableDays: JSON.parse(merchant?.availableDays || '["monday","tuesday","wednesday","thursday","friday"]'),
      popularDaysLabel: merchant?.popularDaysLabel || "Most Popular",
      popularDays: JSON.parse(merchant?.popularDays || "[]"),
      advanceNoticeDays: merchant?.advanceNoticeDays ?? 1,
      allergenDisclaimer: merchant?.allergenDisclaimer || "",
      pageTitle: merchant?.pageTitle || "Team Lunches",
      pageIntro: merchant?.pageIntro || "",
      mealSizes,
      discounts,
    });
  } catch (err) {
    console.error("[api/config] GET error:", err);
    res.status(500).json({ error: "Failed to load config" });
  }
});

app.post("/api/config", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { availableDays, popularDaysLabel, popularDays, advanceNoticeDays, allergenDisclaimer, pageTitle, pageIntro } = req.body;
  const data = {};
  if (availableDays !== undefined) data.availableDays = JSON.stringify(availableDays);
  if (popularDaysLabel !== undefined) data.popularDaysLabel = popularDaysLabel;
  if (popularDays !== undefined) data.popularDays = JSON.stringify(popularDays);
  if (advanceNoticeDays !== undefined) data.advanceNoticeDays = parseInt(advanceNoticeDays) || 1;
  if (allergenDisclaimer !== undefined) data.allergenDisclaimer = allergenDisclaimer;
  if (pageTitle !== undefined) data.pageTitle = pageTitle;
  if (pageIntro !== undefined) data.pageIntro = pageIntro;
  try {
    const updated = await prisma.merchantPlan.upsert({ where: { shop }, create: { shop, ...data }, update: data });
    res.json(updated);
  } catch (err) {
    console.error("[api/config] POST error:", err);
    res.status(500).json({ error: "Failed to save config" });
  }
});

// ─── Meal Sizes ───────────────────────────────────────────────────────────────
app.get("/api/meal-sizes", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const sizes = await prisma.mealSize.findMany({ where: { shop }, orderBy: { sortOrder: "asc" } });
    res.json({ sizes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch meal sizes" });
  }
});

app.post("/api/meal-sizes", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { name, price, description, minOrderPerDay, allergenInfo, active, sortOrder } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: "name and price required" });
  try {
    const size = await prisma.mealSize.create({
      data: { shop, name, price: parseFloat(price), description: description || "", minOrderPerDay: parseInt(minOrderPerDay) || 5, allergenInfo: allergenInfo || "", active: active !== false, sortOrder: parseInt(sortOrder) || 0 },
    });
    res.json(size);
  } catch (err) {
    res.status(500).json({ error: "Failed to create meal size" });
  }
});

app.put("/api/meal-sizes/:id", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { name, price, description, minOrderPerDay, allergenInfo, active, sortOrder } = req.body;
  try {
    const existing = await prisma.mealSize.findFirst({ where: { id: req.params.id, shop } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const data = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = parseFloat(price);
    if (description !== undefined) data.description = description;
    if (minOrderPerDay !== undefined) data.minOrderPerDay = parseInt(minOrderPerDay);
    if (allergenInfo !== undefined) data.allergenInfo = allergenInfo;
    if (active !== undefined) data.active = active;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
    const updated = await prisma.mealSize.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update meal size" });
  }
});

app.delete("/api/meal-sizes/:id", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const existing = await prisma.mealSize.findFirst({ where: { id: req.params.id, shop } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.mealSize.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete meal size" });
  }
});

// ─── Volume Discounts ─────────────────────────────────────────────────────────
app.get("/api/volume-discounts", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const discounts = await prisma.volumeDiscount.findMany({ where: { shop }, orderBy: { minQty: "asc" } });
    res.json({ discounts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch volume discounts" });
  }
});

app.post("/api/volume-discounts", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { minQty, message, discountPercent, sortOrder } = req.body;
  if (!minQty || !message) return res.status(400).json({ error: "minQty and message required" });
  try {
    const discount = await prisma.volumeDiscount.create({
      data: { shop, minQty: parseInt(minQty), message, discountPercent: parseFloat(discountPercent) || 0, sortOrder: parseInt(sortOrder) || 0 },
    });
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: "Failed to create volume discount" });
  }
});

app.put("/api/volume-discounts/:id", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { minQty, message, discountPercent, sortOrder } = req.body;
  try {
    const existing = await prisma.volumeDiscount.findFirst({ where: { id: req.params.id, shop } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const data = {};
    if (minQty !== undefined) data.minQty = parseInt(minQty);
    if (message !== undefined) data.message = message;
    if (discountPercent !== undefined) data.discountPercent = parseFloat(discountPercent);
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
    const updated = await prisma.volumeDiscount.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update volume discount" });
  }
});

app.delete("/api/volume-discounts/:id", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const existing = await prisma.volumeDiscount.findFirst({ where: { id: req.params.id, shop } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.volumeDiscount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete volume discount" });
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────
app.get("/api/orders", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const page = parseInt(req.query.page || "1");
  const take = 20;
  try {
    const [orders, total] = await Promise.all([
      prisma.weeklyOrder.findMany({ where: { shop }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
      prisma.weeklyOrder.count({ where: { shop } }),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / take) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get("/api/settings", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const merchant = await prisma.merchantPlan.findUnique({ where: { shop } });
    res.json({
      plan: merchant?.plan || "free",
      availableDays: JSON.parse(merchant?.availableDays || '["monday","tuesday","wednesday","thursday","friday"]'),
      popularDaysLabel: merchant?.popularDaysLabel || "Most Popular",
      popularDays: JSON.parse(merchant?.popularDays || "[]"),
      advanceNoticeDays: merchant?.advanceNoticeDays ?? 1,
      allergenDisclaimer: merchant?.allergenDisclaimer || "",
      pageTitle: merchant?.pageTitle || "Team Lunches",
      pageIntro: merchant?.pageIntro || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/settings", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { availableDays, popularDaysLabel, popularDays, advanceNoticeDays, allergenDisclaimer, pageTitle, pageIntro } = req.body;
  const data = {};
  if (availableDays !== undefined) data.availableDays = JSON.stringify(availableDays);
  if (popularDaysLabel !== undefined) data.popularDaysLabel = popularDaysLabel;
  if (popularDays !== undefined) data.popularDays = JSON.stringify(popularDays);
  if (advanceNoticeDays !== undefined) data.advanceNoticeDays = parseInt(advanceNoticeDays) || 1;
  if (allergenDisclaimer !== undefined) data.allergenDisclaimer = allergenDisclaimer;
  if (pageTitle !== undefined) data.pageTitle = pageTitle;
  if (pageIntro !== undefined) data.pageIntro = pageIntro;
  try {
    const updated = await prisma.merchantPlan.upsert({ where: { shop }, create: { shop, ...data }, update: data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ─── Billing ──────────────────────────────────────────────────────────────────
app.get("/api/billing/status", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const merchant = await prisma.merchantPlan.findUnique({ where: { shop } });
  const plan = merchant?.plan || "free";
  const [orderCount, revenue] = await Promise.all([
    prisma.weeklyOrder.count({ where: { shop } }),
    prisma.weeklyOrder.aggregate({ where: { shop }, _sum: { totalPrice: true } }),
  ]);
  res.json({
    plan,
    price: PLANS[plan]?.price || 0,
    planDetails: PLANS[plan],
    orderCount,
    totalRevenue: revenue._sum.totalPrice || 0,
  });
});

app.post("/api/billing/subscribe", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const { plan } = req.body;
  if (!plan || !PLANS[plan] || plan === "free") return res.status(400).json({ error: "Invalid plan" });
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/api/billing/callback?shop=${shop}&plan=${plan}`;
  try {
    const result = await shopifyGraphQL(shop, accessToken, CREATE_SUBSCRIPTION, {
      name: `Team Orders ${PLANS[plan].name}`,
      returnUrl,
      test: !IS_PROD,
      lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: PLANS[plan].price, currencyCode: "USD" }, interval: "EVERY_30_DAYS" } } }],
    });
    const { confirmationUrl, userErrors } = result.data.appSubscriptionCreate;
    if (userErrors.length > 0) return res.status(400).json({ error: "Failed", details: userErrors });
    res.json({ confirmationUrl });
  } catch (err) {
    console.error("[billing] subscribe error:", err);
    res.status(500).json({ error: "Subscription failed" });
  }
});

app.get("/api/billing/callback", async (req, res) => {
  const { shop, plan, charge_id } = req.query;
  if (charge_id && plan && shop) {
    await prisma.merchantPlan.upsert({ where: { shop }, create: { shop, plan, subscriptionId: charge_id }, update: { plan, subscriptionId: charge_id } });
  }
  res.redirect(`/?shop=${shop}`);
});

// ─── Static ───────────────────────────────────────────────────────────────────
if (IS_PROD) {
  app.use(serveStatic(path.join(__dirname, "frontend", "dist")));
  app.get("*", (req, res) => res.sendFile(path.join(__dirname, "frontend", "dist", "index.html")));
}

app.listen(PORT, () => console.log(`Team Orders backend running on port ${PORT}`));
