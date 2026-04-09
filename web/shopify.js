import crypto from "crypto";

export function verifyWebhookHmac(rawBody, hmacHeader, secret) {
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

export async function shopifyGraphQL(shop, accessToken, query, variables = {}) {
  const res = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  return res.json();
}

export const PLANS = {
  free:       { name: "Free",       price: 0,   features: ["Basic day selector", "Up to 5 days", "No discount tiers"] },
  starter:    { name: "Starter",    price: 39,  features: ["Full day selector", "Minimum order enforcement", "Team notes", "Advance notice rules", "Allergen warnings"] },
  pro:        { name: "Pro",        price: 59,  features: ["Volume discount tiers", "Order history dashboard", "Recurring order scheduling", "Email confirmation"] },
  enterprise: { name: "Enterprise", price: 199, features: ["Corporate account integration", "Multi-site", "Custom branding", "API access", "Dedicated account manager"] },
};

export const CREATE_SUBSCRIPTION = `
  mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
    appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test) {
      userErrors { field message } confirmationUrl appSubscription { id status }
    }
  }
`;
